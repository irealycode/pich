import json
import os
from datetime import datetime, timedelta
from typing import List, Optional

import jwt
from bson import ObjectId
from fastapi import (Depends, FastAPI, HTTPException, WebSocket,
                     WebSocketDisconnect, status, Response)
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from pymongo import ReturnDocument
from redis import asyncio as aioredis

# Configuration
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://mongodb:27017")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 365  # 1 year
SERVER_ID = "xx1"
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
    user_id: str

class ChatCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class ChatAnchor(BaseModel):
    anchor: str
    chat_id: str

class ChatAnchorJoin(BaseModel):
    anchor: str

class ReplyCreate(BaseModel):
    _id:str
    user_id:str
    content:str
    username:str    

class MessageCreate(BaseModel):
    chat_id: str
    content: str
    reply: None | ReplyCreate
    from_branch: None | str

class UserBlock(BaseModel):
    user_id: str

class MessagesChatParams(BaseModel):
    anchor:str
    limit:int

class PollOption(BaseModel):
    id: str
    text: str
    votes: List[str] = []

class PollData(BaseModel):
    question: str
    options: List[PollOption]
    multiple_choice: Optional[bool] = False
    expires_at: Optional[datetime] = None

class PollCreate(BaseModel):
    chat_id: str
    poll: PollData
    reply: Optional[dict] = None
    from_branch: Optional[str] = None

class VoteData(BaseModel):
    message_id: str
    option_id: str

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
    return {"access_token": access_token, "token_type": "bearer","user_id":str(result.inserted_id)}

@app.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"username": user_data.username})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token({"sub": str(user["_id"])})
    return {"access_token": access_token, "token_type": "bearer","user_id":str(user['_id'])}


# Chat
@app.post("/chats")
async def create_chat(chat_data: ChatCreate, current_user: dict = Depends(get_current_user)):
    chat = {
        "name": chat_data.name,
        "description": chat_data.description,
        "admin_id": str(current_user["_id"]),
        "blocked_users": [],
        "created_at": datetime.utcnow(),
        "anchor":None,
        "joined_users":[str(current_user["_id"])]
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

@app.post("/chats/join")
async def chat_anchor(chatAnchor: ChatAnchorJoin, current_user: dict = Depends(get_current_user)):
    
    result = await db.chats.find_one_and_update({'anchor':chatAnchor.anchor},{"$addToSet":{"joined_users":str(current_user["_id"])}},return_document=ReturnDocument.AFTER)

    if result:
        result["_id"] = str(result["_id"])
        return result
    raise HTTPException(status_code=404, detail="Failed to find chat")

@app.get("/chats")
async def get_chats(current_user: dict = Depends(get_current_user)):
    chats = []
    async for chat in db.chats.find({'joined_users':str(current_user['_id'])}).sort("created_at", -1):
        chat["_id"] = str(chat["_id"])
        chats.append(chat)
    return chats

@app.get("/chats/{chat_id}")
async def get_chat(chat_id: str, current_user: dict = Depends(get_current_user)):
    chat = await db.chats.find_one({"_id": ObjectId(chat_id),'joined_users':str(current_user['_id'])})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    users = []
    for u in chat["joined_users"]:
        print("user : ",u)
        user = await db.users.find_one({"_id":ObjectId(u)})
        users.append({"username":user["username"],"id":u})
    
    chat["joined_users"] = users
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

# Message Polls
@app.post("/messages/polls")
async def send_poll(poll_data: PollCreate, current_user: dict = Depends(get_current_user)):
    chat = await db.chats.find_one({"_id": ObjectId(poll_data.chat_id)})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    user_id = str(current_user["_id"])
    if user_id in chat.get("blocked_users", []):
        raise HTTPException(status_code=403, detail="You are blocked from this chat")
    
    if len(poll_data.poll.options) < 2:
        raise HTTPException(status_code=400, detail="Poll must have at least 2 options")
    
    if len(poll_data.poll.options) > 10:
        raise HTTPException(status_code=400, detail="Poll cannot have more than 10 options")
    
    message = {
        "chat_id": poll_data.chat_id,
        "user_id": user_id,
        "username": current_user["username"],
        "content": poll_data.poll.question,
        "poll": {
            "question": poll_data.poll.question,
            "options": [option.model_dump() for option in poll_data.poll.options],
            "multiple_choice": poll_data.poll.multiple_choice,
            "expires_at": poll_data.poll.expires_at.isoformat() if poll_data.poll.expires_at else None
        },
        "created_at": datetime.utcnow(),
    }
    
    if poll_data.reply:
        message["reply"] = poll_data.reply
    
    if poll_data.from_branch:
        message["from_branch"] = poll_data.from_branch
    
    result = await db.messages.insert_one(message)
    message["_id"] = str(result.inserted_id)
    message["created_at"] = message["created_at"].isoformat()
    # message["type"] = "poll"
    message["type"] = "message"
    
    for user in chat['joined_users']:
        await redis_client.publish(
            f"user:{user}",
            json.dumps(message)
        )
    
    return message

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
        "created_at": datetime.utcnow(),
    }

    if msg_data.reply:
        message["reply"] = msg_data.reply.model_dump()
    if msg_data.from_branch:
        message["from_branch"] = msg_data.from_branch
    result = await db.messages.insert_one(message)
    
    message["_id"] = str(result.inserted_id)
    message["created_at"] = message["created_at"].isoformat()
    message["type"] = "message"

    for user in chat['joined_users']:
        await redis_client.publish(
            f"user:{user}",
            json.dumps(message)
        )
    
    return message

@app.get("/messages/latest/{chat_id}")
async def latest_message(chat_id: str, response: Response ,current_user: dict = Depends(get_current_user)):
    chat = await db.chats.find_one({"_id": ObjectId(chat_id)})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    user_id = str(current_user["_id"])
    if user_id in chat.get("blocked_users", []):
        raise HTTPException(status_code=403, detail="You are blocked from this chat")
    
    message = await db.messages.find_one({"chat_id":chat_id},sort=[("createdAt", -1)])
    if message:
        message["_id"] = str(message["_id"])
        message["created_at"] = message["created_at"].isoformat()
        return message


    response.status_code = status.HTTP_201_CREATED
    return "No messages yet"

@app.get("/messages/like/{chat_id}/{message_id}")
async def send_message(chat_id: str,message_id: str, current_user: dict = Depends(get_current_user)):
    chat = await db.chats.find_one({"_id": ObjectId(chat_id)})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    user_id = str(current_user["_id"])
    if user_id in chat.get("blocked_users", []):
        raise HTTPException(status_code=403, detail="You are blocked from this chat")
    
    await db.messages.update_one({'_id':ObjectId(message_id)},{'$addToSet':{'likes':user_id}})
    
    message = {
        "chat_id": chat_id,
        "user_id": user_id,
        "message_id": message_id,
        "type": "like"
    }
    for user in chat['joined_users']:
        await redis_client.publish(
            f"user:{user}",
            json.dumps(message)
        )
    
    return "liked"

@app.get("/messages/unlike/{chat_id}/{message_id}")
async def send_message(chat_id: str,message_id: str, current_user: dict = Depends(get_current_user)):
    chat = await db.chats.find_one({"_id": ObjectId(chat_id)})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    user_id = str(current_user["_id"])
    if user_id in chat.get("blocked_users", []):
        raise HTTPException(status_code=403, detail="You are blocked from this chat")
    
    await db.messages.update_one({'_id':ObjectId(message_id)},{'$pull':{'likes':user_id}})
    
    message = {
        "chat_id": chat_id,
        "user_id": user_id,
        "message_id": message_id,
        "type": "unlike"
    }
    for user in chat['joined_users']:
        await redis_client.publish(
            f"user:{user}",
            json.dumps(message)
        )
    
    return "unliked"

@app.get("/messages/typing/on/{chat_id}")
async def get_typing(chat_id: str, current_user: dict = Depends(get_current_user)):
    chat = await db.chats.find_one({"_id": ObjectId(chat_id)})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    message = {
        "chat_id": chat_id,
        "user_id": str(current_user["_id"]),
        "username": current_user["username"],
        "type": "typing_start"
    }
    for user in chat['joined_users']:
        await redis_client.publish(
            f"user:{user}",
            json.dumps(message)
        )

    return "Typing sent"

@app.get("/messages/typing/off/{chat_id}")
async def get_typing(chat_id: str, current_user: dict = Depends(get_current_user)):
    chat = await db.chats.find_one({"_id": ObjectId(chat_id)})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    message = {
        "chat_id": chat_id,
        "user_id": str(current_user["_id"]),
        "username": current_user["username"],
        "type": "typing_stop"
    }
    for user in chat['joined_users']:
        await redis_client.publish(
            f"user:{user}",
            json.dumps(message)
        )

    return "Typing sent"

@app.post("/messages/{chat_id}")
async def get_messages(chat_id: str, params: MessagesChatParams, current_user: dict = Depends(get_current_user)):
    print(chat_id,params.anchor,params.limit)
    chat = await db.chats.find_one({"_id":ObjectId(chat_id),"anchor": params.anchor})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    messages = []
    async for msg in db.messages.find({"chat_id": str(chat['_id']),"$or": [
        {"from_branch": {"$exists": False}},
        {"from_branch": None},
        {"from_branch": ""}
    ]}).sort("created_at", -1).limit(params.limit):
        msg["_id"] = str(msg["_id"])
        msg["created_at"] = msg["created_at"].isoformat()
        messages.append(msg)
    
    chat['_id'] = str(chat['_id'])
    return {'chat':chat,'messages':list(reversed(messages))}


#Branches
@app.post("/messages/branch/{chat_id}/{branch_id}")
async def get_messages_branch(chat_id: str, branch_id: str, params: MessagesChatParams, current_user: dict = Depends(get_current_user)):
    print(chat_id,params.anchor,params.limit)
    chat = await db.chats.find_one({"_id":ObjectId(chat_id),"anchor": params.anchor})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    branch = await db.branches.find_one({"_id":ObjectId(branch_id)})
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    messages = []
    async for msg in db.messages.find({"chat_id": str(chat['_id']),"from_branch":branch_id}).sort("created_at", -1).limit(params.limit):
        msg["_id"] = str(msg["_id"])
        msg["created_at"] = msg["created_at"].isoformat()
        messages.append(msg)
    
    message = await db.messages.find_one({"_id":ObjectId(branch["message_id"])})
    message["_id"] = str(message["_id"])
    branch["_id"] = str(branch["_id"])
    branch["branched_by"] = str(branch["branched_by"])
    branch["message"] = message
    
    return {'branch':branch,'messages':list(reversed(messages))}

@app.get("/messages/branch/{chat_id}/{message_id}")
async def branch_message(chat_id: str, message_id: str, current_user: dict = Depends(get_current_user)):
    chat = await db.chats.find_one({"_id":ObjectId(chat_id)})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    branch = await db.branches.find_one({"message_id":message_id})
    if branch:
        return str(branch["_id"])
    
    branch_data = {
        "message_id": message_id,
        "chat_id": chat_id,
        "branched_by": str(current_user["_id"])
    }

    branch_inserted = await db.branches.insert_one(branch_data)

    db.messages.update_one({"_id":ObjectId(message_id)},{"$set":{"branch":str(branch_inserted.inserted_id)}})
    
    return str(branch_inserted.inserted_id)

@app.get("/messages/branch/{branch_id}")
async def branch_message(branch_id: str, current_user: dict = Depends(get_current_user)):
    
    branch = await db.branches.find_one({"_id":ObjectId(branch_id)})
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    message = await db.messages.find_one({"_id":ObjectId(branch["message_id"])})
    message["_id"] = str(message["_id"])
    branch["_id"] = str(branch["_id"])
    branch["branched_by"] = str(branch["branched_by"])
    branch["message"] = message
    print(branch)
    return branch





    
    
# WebSocket for real-time chat
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        del self.active_connections[user_id]

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket,  token: str):
    #am only doing this user oriented subscription because am using one
    #MUST CHANGE on scale
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
        
        await manager.connect(websocket, user_id)
        
        pubsub = redis_client.pubsub()
        await pubsub.subscribe(f"user:{user_id}")
        
        try:
            while True:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message and message["type"] == "message":
                    data = json.loads(message["data"])
                    if data["user_id"] != user_id:
                        await websocket.send_json(data)
        except WebSocketDisconnect:
            manager.disconnect(user_id)
            await pubsub.unsubscribe(f"user:{user_id}")
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