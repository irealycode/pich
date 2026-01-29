import { BackIcon } from '@/assets/svgs/Back';
import { CloseIcon } from '@/assets/svgs/Close';
import { PlusIcon } from '@/assets/svgs/Plus';
import { PollsIcon } from '@/assets/svgs/Polls';
import { ReplyLineIcon } from '@/assets/svgs/ReplyLine';
import { SendIcon } from '@/assets/svgs/Send';
import CreatePoll from '@/components/ui/CreatePoll';
import MessageBubble from '@/components/ui/MessageBubble';
import MessageBubbleDead from '@/components/ui/MessageBubbleDead';
import MessagePollBubble, { Poll, PollOption } from '@/components/ui/MessagePollBubble';
import TypingAnimation from '@/components/ui/TypingDots';
import { useSocket } from '@/components/ws/SocketContext';
import { decrypt, encrypt, encryptECB } from '@/imports/crypto';
import { ip, port } from '@/imports/overall';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import jdenticon from "jdenticon/standalone";
import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';



interface TaskSQL {
  id : number,
  title : string,
  date : `${number}/${number}/${number}`,
  priority : string,
  notif_id : string,
  completed : number,
}

interface Task {
  id : number,
  title : string,
  date : `${number}/${number}/${number}`,
  priority : string,
  completed : boolean,
  notif_id : string,
}

interface Reply {
  _id: string,
  content: string,
  user_id: string,
  username: string
}

export interface Message{
  _id: string, 
  chat_id: string,
  content: string,
  created_at: string,
  user_id: string,
  username?: string,
  reply?: Reply | null,
  likes?: string[],
  branch?: string,
  from_branch?: string,
  poll?:Poll
}

interface TypingUser {
  username: string
}
const screen = Dimensions.get("screen")

export default function ChatInterface() {
  const { onMessage } = useSocket();
  const {chat_id,key,name,description} = useLocalSearchParams<{ chat_id:string,key:string, name: string,description:string }>()
  const token = useRef('')
  const user_id = useRef('')
  const navigation = useNavigation();
  const db_ = useRef<SQLite.SQLiteDatabase | null>(null)
  const [tasks, setTasks] = useState<Task[]>([]);
  const [message, setMessage] = useState('');
  const msgTabY = useSharedValue(100)
  const topTabY = useSharedValue(0)
  const [messages,setMessages] = useState<Message[]>([])
  const [messageToReply,setMessageToReply] = useState<Message | null>(null)
  const [toggleChatPosition,setToggleChatPosition] = useState(false)
  const scrollViewRef = useRef<any | undefined>(undefined);
  const [contentHeight, setContentHeight] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [showMoreOptions,setShowMoreOptions] = useState(false);
  const [showSendPoll,setShowSendPoll] = useState(false);
  const [userTyping, setUserTyping] = useState<TypingUser[]>([]);
  const usersTyping = useRef<TypingUser[]>([]);
  const typingTimeout = useRef<number | null>(null);
  const isTypingRef = useRef(false);
  const replyPaddingTop = useSharedValue(0)
  const moreOptionsScale = useSharedValue(0)
  const replyStyle = useAnimatedStyle(()=>({
    paddingTop:replyPaddingTop.value
  }))
  const replyComponentsStyle = useAnimatedStyle(()=>({
    opacity:replyPaddingTop.value/75
  }))
  const moreOptionsStyle = useAnimatedStyle(()=>({
    transform: [{ scale: moreOptionsScale.value }],
  }))
  const [messageBubbleSelected, setMessageBubbleSelected] = useState<Message | null>(null);
  

    useFocusEffect(
      useCallback(() => {
        msgTabY.value = withTiming(0, { duration: 300 })
        topTabY.value = withTiming(100, { duration: 300 })
        scrollToBottomMessages()
        
      }, [contentHeight])
    );

    useFocusEffect(
      useCallback(() => {
      AsyncStorage.getItem('token').then((t)=>{
        if (t) {
          token.current = t
          getChat()
        }
      })
      AsyncStorage.getItem('user_id').then((t)=>{
        if (t) {
          user_id.current = t
        }
      })
      const unsubscribe = onMessage((msg) => {
        console.log('Received:', msg);
        if(msg.chat_id === chat_id){
          if(msg.type === "typing_start"){
            usersTyping.current = [...usersTyping.current,{username:msg.username}]
            setUserTyping(usersTyping.current)
          }else if(msg.type === "typing_stop"){
            usersTyping.current = usersTyping.current.filter(u => u.username !== msg.username)
            setUserTyping(usersTyping.current)
          }else if(msg.type === "message"){
            receiveMessage(msg)
          }else if(msg.type === "like"){
            setMessages(prev => prev.map((m)=>m._id === msg.message_id?({...m,likes:m.likes?[...m.likes,msg.user_id]:[msg.user_id]}):m))
          }else if(msg.type === "unlike"){
            setMessages(prev => prev.map((m)=>m._id === msg.message_id?({...m,likes:m.likes?.filter((l)=>l !== msg.user_id)}):m))
          }
        }
      });
      return unsubscribe;
      }, [chat_id,key,name])
    );


    const receiveMessage = async(msg : Message) => {
      if(msg.from_branch) return
      const decryptedMsg = decrypt(msg.content,key)
      setMessages(prev=>[...prev,({...msg,content:decryptedMsg})])
    }
    const parseAndDecryptMessages = async(msgs : Message[]) =>{
      const msgsCopy : Message[] = []
      msgs.forEach(async m => {
        if (m.poll) {
          const content = decrypt(m.content,key)
          const poll : Poll = {question:content,options:m.poll.options.map((op)=>({...op,text:decrypt(op.text,key)}))}
          msgsCopy.push({...m,content,poll})
          console.log(m.poll)
        }else{
          const content = decrypt(m.content,key)
          msgsCopy.push({...m,content})
        }
      });
      return msgsCopy
    }
    
    const getChat = async() =>{
        try {
          const anchor = await encryptECB(chat_id,key)
          const req = {
            anchor,
            limit: 50
          }
          const res = await axios.post(`http://${ip}:${port}/messages/${chat_id}`,req,{
            headers:{
              Authorization : `Bearer ${token.current}`
            }
          })
          const data = res.data
          const parsedMessages = await parseAndDecryptMessages(data.messages)
          setMessages(parsedMessages)
        } catch (error) {
          console.error(error)
        }
    }

    const startTyping = () => {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        sendTyping(true)
      }

      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
    };

    // const startTyping = async() => {
    //   setIsTyping(true);
    //   if (typingTimeout.current) {
    //     clearTimeout(typingTimeout.current);
    //   }
    //   const res = await axios.get(`http://${ip}:${port}/messages/typing/on/${chat_id}`,{
    //     headers:{
    //       Authorization : `Bearer ${token.current}`
    //     }
    //   })

    // };

    const stopTyping = () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }

      typingTimeout.current = setTimeout(() => {
        if (isTypingRef.current) {
          isTypingRef.current = false;
          sendTyping(false);
        }
      }, 800);
    };

    

    const sendTyping = async(typing : boolean) => {
      if (typing) {
        const res = await axios.get(`http://${ip}:${port}/messages/typing/on/${chat_id}`,{
          headers:{
            Authorization : `Bearer ${token.current}`
          }
        })
        return
      }
       const res = await axios.get(`http://${ip}:${port}/messages/typing/off/${chat_id}`,{
          headers:{
            Authorization : `Bearer ${token.current}`
          }
        })
    }

    const sendMessage = async() =>{
      if (message.trim().length === 0) {
        return
      }
      try {
        const msgEncrypted = await encrypt(message,key)
        let reply = null
        let from_branch = null
        if (messageToReply) {
          reply = {
            _id : messageToReply._id,
            content : messageToReply.content,
            user_id : messageToReply.user_id,
            username: messageToReply.username
          }
          removeReply()
        }
        let req = {
          "chat_id": chat_id,
          "content": msgEncrypted,
          "reply": reply,
          "from_branch" : from_branch
        }
        const res = await axios.post(`http://${ip}:${port}/messages`,req,{
          headers:{
            Authorization : `Bearer ${token.current}`
          }
        })
        const data = res.data
        console.log(data)
        setMessage('')
        setMessages(prev=>[...prev,({...data,content:message})])
        scrollToBottomMessages()
      } catch (error) {
        console.error(error)
      }
    }

  

  const scrollToBottomMessages = () =>{
    scrollViewRef.current?.scrollTo({y:contentHeight,x:0, animated: true });
  }

  const goBack = () =>{
    msgTabY.value = withTiming(100, { duration: 300 })
    topTabY.value = withTiming(0, { duration: 300 })
    setMessages([])
    navigation.goBack()
  }

  const msgBarStyleAnim = useAnimatedStyle(() => ({
    transform: [{translateY:`${msgTabY.value}%`}],
  }));
  const topBarStyleAnim = useAnimatedStyle(() => ({
    transform: [{translateY:`${topTabY.value}%`}]
  }));

  const chatDetails = () =>{
    router.push({pathname:'/(tabs)/(chat)/chat_details',params:{name,chat_id,key}})
  }

  const removeReply = () => {
    replyPaddingTop.value = withTiming(0,{ duration : 300 })
    setTimeout(()=>{
      setMessageToReply(null)
    },300)
  }

  const moreOptions = () =>{
    setShowMoreOptions(true)
    moreOptionsScale.value = 0
    setTimeout(()=>{
        moreOptionsScale.value = withSpring(1, { damping:60 })
    },200)
  }

  // CHAT BUBBLE ACTIONS
  
  const onReply = (message : Message) =>{
    setMessageBubbleSelected(null)
    setMessageToReply(message)
    setTimeout(()=>{
      replyPaddingTop.value = withTiming(75,{ duration : 300 })
    },300)
  }

  const onLike = async(message : Message) =>{
    setMessageBubbleSelected(null)
    if(!message.likes || !message.likes.includes(user_id.current)){
      await axios.get(`http://${ip}:${port}/messages/like/${chat_id}/${message._id}`,{
          headers:{
            Authorization : `Bearer ${token.current}`
          }
      })
      setMessages(prev => prev.map((m)=>m._id === message._id?({...m,likes:m.likes?[...m.likes,user_id.current]:[user_id.current]}):m))
    }
    
  }

  const onUnLike = async(message : Message) =>{
    setMessageBubbleSelected(null)
    if(message.likes?.includes(user_id.current)){
      await axios.get(`http://${ip}:${port}/messages/unlike/${chat_id}/${message._id}`,{
        headers:{
          Authorization : `Bearer ${token.current}`
        }
      })
      setMessages(prev => prev.map((m)=>m._id === message._id?({...m,likes:m.likes?.filter((l)=>l !== user_id.current)}):m))
    }
  }

  const onLongPress = async(message : Message) =>{
    console.log('long press')
    setMessageBubbleSelected(message)
  }

  const onBranch = async(message: Message) =>{
    if (!message.branch) {
       const branch = await axios.get(`http://${ip}:${port}/messages/branch/${chat_id}/${message._id}`,{
        headers:{
          Authorization : `Bearer ${token.current}`
        }
      })
      setMessageBubbleSelected(null)
      router.push({pathname:'/(tabs)/(chat)/branch',params:{chat_id,key,name,description,branch_id:branch.data}})
      return
    }
    setMessageBubbleSelected(null)
    router.push({pathname:'/(tabs)/(chat)/branch',params:{chat_id,key,name,description,branch_id:message.branch}})
    console.log(message)
  }

  const onSendPoll = async(question: string, options: string[]) => {
    try {
        let pollOptions : PollOption[] = [];
        options.forEach(async(e,index) => {
          const textEnc = await encrypt(e,key)
          pollOptions.push({
              id: `option_${Date.now()}_${index}`,
              text: textEnc,
              votes: []
          })
        })
        const questionEnc = await encrypt(question,key);
        const response = await axios.post(`http://${ip}:${port}/messages/polls`, {
            chat_id: chat_id,
            poll: {
                question: questionEnc,
                options: pollOptions,
                multiple_choice: false,
                expires_at: null
            }
        },{
        headers:{
          Authorization : `Bearer ${token.current}`
        }
      });

        console.log('Poll sent:', response.data);
    } catch (error) {
        console.error('Error sending poll:', error);
    }
}

  const onClose = () =>{
    setShowSendPoll(false)
  }
  
  
  const chatIcon = jdenticon.toSvg(chat_id.slice(16),30)
  return (
    <SafeAreaView style={styles.container}>
      
      

      <Animated.View style={[topBarStyleAnim,{position:'absolute',top:-100,width:'100%',zIndex:90}]}  >
        <BlurView intensity={50} tint="dark" style={{paddingHorizontal:20,paddingVertical:10,paddingTop:50,width:'100%',borderBottomWidth:1,borderColor:'#ffffff31'}}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={()=>goBack()} >
                <BackIcon size={35} color='white' />
              </TouchableOpacity>
              <TouchableOpacity onPress={()=>chatDetails()} style={{display:'flex',flexDirection:'row',gap:5,alignItems:'center',justifyContent:'center'}}>
                <SvgXml xml={chatIcon} width={35} height={35} />
                <Text style={{fontFamily:'Agdasima',fontSize:30,color:'white',marginTop:-5}}>{name}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Animated.View>


      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={-20}
      >
        <ScrollView 
          onContentSizeChange={(width, height) => {
            setContentHeight(height);
            console.log('Content height:', height);
          }}
          ref={scrollViewRef}
          style={{marginTop:30}}
          scrollEnabled={!messageBubbleSelected}
          contentContainerStyle={{paddingTop:20,paddingBottom:toggleChatPosition?35:75,paddingHorizontal:20}}
          showsVerticalScrollIndicator={false}
          
        >
          <View style={styles.dateBadgeContainer}>
            <BlurView intensity={40} tint="dark" style={styles.dateBadge}>
              <Text style={styles.dateBadgeText}>CHAT CREATED</Text>
            </BlurView>
          </View>

          {(messageBubbleSelected || showMoreOptions || showSendPoll) && <Pressable onPress={()=>{setMessageBubbleSelected(null);setShowMoreOptions(false)}} style={{position:'absolute',top:contentHeight < screen.height - 150? 0:'auto',bottom:contentHeight < screen.height - 150? 'auto':0,left:0,width:screen.width,height:contentHeight < screen.height? screen.height:contentHeight,zIndex:2}} >
            <BlurView intensity={40} tint="dark" style={{width:'100%',height:'100%'}}>

            </BlurView>
          </Pressable>}

          {
            messages.map((msg,i)=>{
              const sameUserBelow = msg.user_id === messages[i + 1]?.user_id
              const sameUserOnTop = msg.user_id === messages[i - 1]?.user_id
              const bySender = msg.user_id === user_id.current
              const isSelected = messageBubbleSelected?messageBubbleSelected._id === msg._id:false
              // const user_colors = stringToColor(msg.user_id)
              if (msg.poll) {
                return(
                  <MessagePollBubble key={msg._id} 
                  // zIndex={isSelected?3:1}
                  isSelected={isSelected}
                  user_id={user_id.current} 
                  message={msg} 
                  sameUserBelow={sameUserBelow} 
                  sameUserOnTop={sameUserOnTop} 
                  bySender={bySender}
                  onLongPress={onLongPress} 
                  onReply={onReply} 
                  onLike={onLike} 
                  onUnLike={onUnLike} 
                  onBranch={onBranch}
                  onVote={()=>{}}
                   />
                )
              }
              return(
                <MessageBubble key={msg._id} 
                  // zIndex={isSelected?3:1}
                  isSelected={isSelected}
                  user_id={user_id.current} 
                  message={msg} 
                  sameUserBelow={sameUserBelow} 
                  sameUserOnTop={sameUserOnTop} 
                  bySender={bySender}
                  onLongPress={onLongPress} 
                  onReply={onReply} 
                  onLike={onLike} 
                  onUnLike={onUnLike} 
                  onBranch={onBranch}
                />
              )
            })
          }
          {/* {userTyping[0] && <View style={{position:'relative',flexDirection: 'row',maxHeight:42}}>
            <View style={{}}>
                <LinearGradient
                colors={['rgba(34, 149, 57, 0.9)', 'rgba(0, 186, 65, 0.88)']}
                style={{padding: 10,paddingHorizontal:15,borderRadius: 16,borderBottomLeftRadius:5,display:'flex',flexDirection:'row',alignItems:'flex-end',justifyContent:'flex-start'}}
                >
                <Text style={{color: 'white',fontSize: 18,fontWeight:'600',fontFamily:'Agdasima',paddingRight:15}}>
                  {userTyping[0].username} typing 
                </Text>
                <View style={{position:'absolute',right:-10,bottom:13}} >
                  <TypingAnimation dotColor='#fff' dotSize={3} />
                </View>
                </LinearGradient>
            </View>
        </View>} */}
        </ScrollView>

        {showSendPoll && <CreatePoll onClose={onClose} onSendPoll={onSendPoll} chatId={chat_id} />}

        <Animated.View style={[msgBarStyleAnim,{position:toggleChatPosition?'fixed':'absolute',bottom:toggleChatPosition?0:-40,width:'100%'}]} >
          {userTyping[0] && <View style={{position:'absolute',top:-27,display:'flex',flexDirection:'row',alignItems:'flex-end'}} >
            <Text style={{fontFamily:'Agdasima',color:'white',left:20,fontSize:18,marginBottom:-1}} >{userTyping[0].username} typing</Text>
            <TypingAnimation dotColor='#fff' dotSize={3} />
          </View>}
            {/* More Options */}

          {showMoreOptions && <Animated.View style={[{position:'absolute',top:-70,left:15,height:55,width:180,borderRadius:16,borderWidth:1,borderColor:'#afafaf44',backgroundColor:'#2626262b'},moreOptionsStyle]} >
                  <View style={{display:'flex',alignItems:'flex-start',paddingHorizontal:15,justifyContent:'center',width:'100%',flexDirection:'column',position:'absolute',bottom:10,gap:10}} >
                      <TouchableOpacity onPress={()=>setShowSendPoll(true)} style={{display:'flex',alignItems:'center',flexDirection:'row',gap:10}} >
                          <PollsIcon size={34} color="rgb(65, 187, 235)" />
                          <Text style={{color:'#ffffff',fontSize:20,fontWeight:600,fontFamily:'Agdasima'}} >Create Poll</Text>
                      </TouchableOpacity>
                  </View>
            </Animated.View>}
          <BlurView intensity={40} tint="dark" style={[styles.footer]}>

            

            {/* Message Bar */}
            <Animated.View style={[styles.inputContainer,{position:'relative'},replyStyle]}>
              {messageToReply && <Animated.View style={[{position:'absolute',top:15,left:30,display:'flex',flexDirection:'row',zIndex:90,width:screen.width - 100},replyComponentsStyle]} >
                <Text style={{position:'absolute',top:-23,left:0,fontFamily:'Agdasima',color:'white',fontSize:16}} >Replied to {messageToReply.user_id === user_id.current? "yourself":messageToReply.username}</Text>
                <ReplyLineIcon style={{position:'absolute',left:-45,bottom:-15}} size={50} color="#4e739068" />
                <MessageBubbleDead message={messageToReply} sameUserOnTop={false} sameUserBelow={false} bySender={messageToReply.user_id === user_id.current} />
                <TouchableOpacity style={{position:'absolute',right:-40,bottom:0}} onPress={()=>removeReply()} >
                  <CloseIcon size={40} color="#41627c" />
                </TouchableOpacity>
              </Animated.View>}

              <TouchableOpacity onPress={()=>moreOptions()} style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
                {/* <Text style={styles.sendIcon}>↑</Text> */}
                <LinearGradient
                    colors={['rgba(107, 181, 237, 0.9)', 'rgba(43, 183, 238, 0.7)']}
                    style={{padding:5,borderRadius:50}}
                  >
                        
                  <PlusIcon size={32} color='#fff' />
                </LinearGradient>
              </TouchableOpacity>
              
              <View style={[styles.inputWrapper,{zIndex:99}]}>
                <TextInput
                  style={styles.input}
                  placeholder="Type Message..."
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={message}
                  onChangeText={(text)=>{startTyping();stopTyping();setMessage(text)}}
                  multiline
                  onFocus={()=>{setToggleChatPosition(true)}}
                  onBlur={() => {
                    setToggleChatPosition(false)
                    if (typingTimeout.current) {
                      clearTimeout(typingTimeout.current);
                    }

                    if (isTypingRef.current) {
                      isTypingRef.current = false;
                      sendTyping(false)
;
                    }
                  }}
                />
                
              </View>

              <TouchableOpacity onPress={()=>sendMessage()} style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
                {/* <Text style={styles.sendIcon}>↑</Text> */}
                <LinearGradient
                    colors={['rgba(107, 181, 237, 0.9)', 'rgba(43, 183, 238, 0.7)']}
                    style={{padding:10,borderRadius:50}}
                  >
                        
                  <SendIcon color='white' size={22} />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </BlurView>
        </Animated.View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101622',
  },
  flex: {
    flex: 1,
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blob: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.3,
  },
  blobBlue: {
    top: -100,
    left: -50,
    width: 300,
    height: 300,
    backgroundColor: '#2b6cee',
  },
  blobPurple: {
    top: 200,
    right: -100,
    width: 350,
    height: 350,
    backgroundColor: '#9333ea',
  },
  blobCyan: {
    bottom: -100,
    left: -80,
    width: 280,
    height: 280,
    backgroundColor: '#06b6d4',
  },
  header: {
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#101622',
  },
  headerText: {
    gap: 2,
  },
  headerTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#2b6cee',
    fontSize: 12,
    fontWeight: '500',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 20,
  },
  chatContainer: {
  },
  chatContent: {
    padding: 16,
    gap: 24,
  },
  dateBadgeContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dateBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  dateBadgeText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.5,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    opacity: 0.8,
  },
  messageContent: {
    maxWidth: '75%',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    overflow:'hidden'
  },
  messageTime: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    marginLeft: 4,
  },
  messageTimeUser: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    marginRight: 4,
  },
  messageBubbleAI: {
    padding: 16,
  },
  messageBubbleUser: {
    
    
  },
  messageText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    lineHeight: 22,
    
  },
  readReceipt: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 10,
    marginRight: 4,
  },
  highlight: {
    color: '#2b6cee',
    fontWeight: '500',
  },
  taskBubble: {
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  taskList: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    gap: 12,
  },
  taskItemBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  checkbox: {
    marginTop: 2,
  },
  checkboxUnchecked: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  checkboxChecked: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#2b6cee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  taskTextContainer: {
    flex: 1,
    gap: 2,
  },
  taskTitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '500',
  },
  taskSubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  addButton: {
    margin: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(43, 108, 238, 0.2)',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#2b6cee',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  footer: {
    width:'100%',
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#ffffff31',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  addCircleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCircleIcon: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 24,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgb(21, 33, 44)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingRight: 8,
  },
  input: {
    flex: 1,
    color: 'white',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 120,
  },
  micButton: {
    padding: 6,
    marginBottom: 6,
  },
  micIcon: {
    fontSize: 18,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2b6cee',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2b6cee',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  sendIcon: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
});