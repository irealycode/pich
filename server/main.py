import json
import os
from datetime import datetime, timedelta
from typing import List, Optional

import jwt
from bson import ObjectId
from fastapi import (Depends, FastAPI, HTTPException, WebSocket,
                     WebSocketDisconnect, status)
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from redis import asyncio as aioredis

# Configuration
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://mongodb:27017")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 365  # 1 year

# Initialize FastAPI
app = FastAPI(title="Chat API")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Database clients
mongodb_client: Optional[AsyncIOMotorClient] = None
redis_client: Optional[aioredis.Redis] = None
db = None

# Pydantic Models
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, _schema_generator):
        return {"type": "string"}

class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class ChatCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class ChatAnchor(BaseModel):
    anchor: str
    chat_id: str

class MessageCreate(BaseModel):
    chat_id: str
    content: str

class UserBlock(BaseModel):
    user_id: str

# Startup and Shutdown
@app.on_event("startup")
async def startup_db():
    global mongodb_client, redis_client, db
    mongodb_client = AsyncIOMotorClient(MONGODB_URL)
    db = mongodb_client.chat_db
    redis_client = await aioredis.from_url(REDIS_URL, decode_responses=True)
    
    # Create indexes
    await db.users.create_index("username", unique=True)
    await db.chats.create_index("created_at")
    await db.messages.create_index([("chat_id", 1), ("created_at", -1)])

@app.on_event("shutdown")
async def shutdown_db():
    if mongodb_client:
        mongodb_client.close()
    if redis_client:
        await redis_client.close()

# Helper Functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Auth Endpoints
@app.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user = {
        "username": user_data.username,
        "password": hash_password(user_data.password),
        "created_at": datetime.utcnow()
    }
    result = await db.users.insert_one(user)
    
    access_token = create_access_token({"sub": str(result.inserted_id)})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"username": user_data.username})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token({"sub": str(user["_id"])})
    return {"access_token": access_token, "token_type": "bearer"}

# Chat
@app.post("/chats")
async def create_chat(chat_data: ChatCreate, current_user: dict = Depends(get_current_user)):
    chat = {
        "name": chat_data.name,
        "description": chat_data.description,
        "admin_id": str(current_user["_id"]),
        "blocked_users": [],
        "created_at": datetime.utcnow(),
        "anchor":None
    }
    result = await db.chats.insert_one(chat)
    
    chat["_id"] = str(result.inserted_id)
    return chat

@app.post("/chats/anchor")
async def chat_anchor(chatAnchor: ChatAnchor, current_user: dict = Depends(get_current_user)):
    
    result = await db.chats.update_one({"anchor":None,'_id':ObjectId(chatAnchor.chat_id),'admin_id':str(current_user["_id"])},{ "$set":{"anchor":chatAnchor.anchor}})

    if result.modified_count == 1: 
        return 'Anchor installed'
    raise HTTPException(status_code=404, detail="Failed to find chat")

@app.get("/chats")
async def get_chats(current_user: dict = Depends(get_current_user)):
    chats = []
    async for chat in db.chats.find().sort("created_at", -1):
        chat["_id"] = str(chat["_id"])
        chats.append(chat)
    return chats

@app.get("/chats/{chat_id}")
async def get_chat(chat_id: str, current_user: dict = Depends(get_current_user)):
    chat = await db.chats.find_one({"_id": ObjectId(chat_id)})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    chat["_id"] = str(chat["_id"])
    return chat

@app.post("/chats/{chat_id}/block")
async def block_user(chat_id: str, user_data: UserBlock, current_user: dict = Depends(get_current_user)):
    chat = await db.chats.find_one({"_id": ObjectId(chat_id)})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    if chat["admin_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Only admin can block users")
    
    await db.chats.update_one(
        {"_id": ObjectId(chat_id)},
        {"$addToSet": {"blocked_users": user_data.user_id}}
    )
    return {"message": "User blocked"}

@app.post("/chats/{chat_id}/unblock")
async def unblock_user(chat_id: str, user_data: UserBlock, current_user: dict = Depends(get_current_user)):
    chat = await db.chats.find_one({"_id": ObjectId(chat_id)})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    if chat["admin_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Only admin can unblock users")
    
    await db.chats.update_one(
        {"_id": ObjectId(chat_id)},
        {"$pull": {"blocked_users": user_data.user_id}}
    )
    return {"message": "User unblocked"}

# Message Endpoints
@app.post("/messages")
async def send_message(msg_data: MessageCreate, current_user: dict = Depends(get_current_user)):
    chat = await db.chats.find_one({"_id": ObjectId(msg_data.chat_id)})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    user_id = str(current_user["_id"])
    if user_id in chat.get("blocked_users", []):
        raise HTTPException(status_code=403, detail="You are blocked from this chat")
    
    message = {
        "chat_id": msg_data.chat_id,
        "user_id": user_id,
        "username": current_user["username"],
        "content": msg_data.content,
        "created_at": datetime.utcnow()
    }
    result = await db.messages.insert_one(message)
    
    message["_id"] = str(result.inserted_id)
    message["created_at"] = message["created_at"].isoformat()
    
    # Publish to Redis for real-time delivery
    await redis_client.publish(
        f"chat:{msg_data.chat_id}",
        json.dumps(message)
    )
    
    return message

@app.get("/messages/{chat_id}")
async def get_messages(chat_id: str, limit: int = 50, current_user: dict = Depends(get_current_user)):
    chat = await db.chats.find_one({"_id": ObjectId(chat_id)})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    messages = []
    async for msg in db.messages.find({"chat_id": chat_id}).sort("created_at", -1).limit(limit):
        msg["_id"] = str(msg["_id"])
        msg["created_at"] = msg["created_at"].isoformat()
        messages.append(msg)
    
    return list(reversed(messages))

# WebSocket for real-time chat
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict = {}

    async def connect(self, websocket: WebSocket, chat_id: str, user_id: str):
        await websocket.accept()
        if chat_id not in self.active_connections:
            self.active_connections[chat_id] = {}
        self.active_connections[chat_id][user_id] = websocket

    def disconnect(self, chat_id: str, user_id: str):
        if chat_id in self.active_connections:
            self.active_connections[chat_id].pop(user_id, None)
            if not self.active_connections[chat_id]:
                del self.active_connections[chat_id]

manager = ConnectionManager()

@app.websocket("/ws/{chat_id}")
async def websocket_endpoint(websocket: WebSocket, chat_id: str, token: str):
    try:
        # Verify token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=1008)
            return
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            await websocket.close(code=1008)
            return
        
        # Check if user is blocked
        chat = await db.chats.find_one({"_id": ObjectId(chat_id)})
        if not chat:
            await websocket.close(code=1008)
            return
        
        if user_id in chat.get("blocked_users", []):
            await websocket.close(code=1008)
            return
        
        await manager.connect(websocket, chat_id, user_id)
        
        # Subscribe to Redis channel
        pubsub = redis_client.pubsub()
        await pubsub.subscribe(f"chat:{chat_id}")
        
        try:
            while True:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message and message["type"] == "message":
                    data = json.loads(message["data"])
                    # Don't send message back to sender
                    if data["user_id"] != user_id:
                        await websocket.send_json(data)
        except WebSocketDisconnect:
            manager.disconnect(chat_id, user_id)
            await pubsub.unsubscribe(f"chat:{chat_id}")
            await pubsub.close()
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close(code=1011)

@app.get("/")
async def root():
    return {"message": "Chat API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4242)