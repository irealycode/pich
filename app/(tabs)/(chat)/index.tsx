import { BackIcon } from '@/assets/svgs/Back';
import TypingAnimation from '@/components/ui/TypingDots';
import { useSocket } from '@/components/ws/SocketContext';
import { decrypt, encrypt } from '@/imports/crypto';
import { ip, port } from '@/imports/overall';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import React, { useCallback, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';



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

interface Message{
  _id: string, 
  chat_id: string,
  content: string,
  created_at: string,
  user_id: string,
  username?: string
}

interface TypingUser {
  username: string
}

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
  const [toggleChatPosition,setToggleChatPosition] = useState(false)
  const scrollViewRef = useRef<ScrollView | undefined>(undefined);
  const [contentHeight, setContentHeight] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [userTyping, setUserTyping] = useState<TypingUser[]>([]);
  const usersTyping = useRef<TypingUser[]>([]);
  const typingTimeout = useRef<number | null>(null);
  const isTypingRef = useRef(false);


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
          }else{
            receiveMessage(msg)
          }
        }
      });
      return unsubscribe;
      }, [chat_id,key,name])
    );


    const receiveMessage = async(msg : Message) => {
      const decryptedMsg = decrypt(msg.content,key)
      setMessages(prev=>[...prev,({...msg,content:decryptedMsg})])
    }
    const parseAndDecryptMessages = async(msgs : Message[]) =>{
      const msgsCopy : Message[] = []
      msgs.forEach(async m => {
        const content = await decrypt(m.content,key)
        msgsCopy.push({...m,content})
      });
      return msgsCopy
    }
    
    const getChat = async() =>{
        try {
          const anchor = await encrypt(chat_id,key)
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
          console.log('CHAT:',data)
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
        const req = {
          "chat_id": chat_id,
          "content": msgEncrypted,
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
    transform: [{translateY:`${msgTabY.value}%`}]
  }));
  const topBarStyleAnim = useAnimatedStyle(() => ({
    transform: [{translateY:`${topTabY.value}%`}]
  }));

  const chatDetails = () =>{
    router.push({pathname:'/(tabs)/(chat)/chat_details',params:{name,chat_id,key}})
    console.log('okok')
  }
  

  

  return (
    <SafeAreaView style={styles.container}>
      

      <Animated.View style={[topBarStyleAnim,{position:'absolute',top:-100,width:'100%',zIndex:90}]}  >
        <BlurView intensity={50} tint="dark" style={{paddingHorizontal:20,paddingVertical:10,paddingTop:50,width:'100%',borderBottomWidth:1,borderColor:'#ffffff31'}}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={()=>goBack()} >
                <BackIcon size={35} color='white' />
              </TouchableOpacity>
              <TouchableOpacity onPress={()=>chatDetails()} style={styles.headerText}>
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
          contentContainerStyle={{paddingTop:20,paddingBottom:toggleChatPosition?35:75,paddingHorizontal:20}}
          showsVerticalScrollIndicator={false}
          
        >
          <View style={styles.dateBadgeContainer}>
            <BlurView intensity={40} tint="dark" style={styles.dateBadge}>
              <Text style={styles.dateBadgeText}>TODAY</Text>
            </BlurView>
          </View>

          {
            messages.map((msg,i)=>{
              // console.log(messages)
              // messages.filter((ms)=>ms.user_id !== user_id.current)
              const sameUserBelow = msg.user_id === messages[i + 1]?.user_id
              const sameUserOnTop = msg.user_id === messages[i - 1]?.user_id
              // const user_colors = stringToColor(msg.user_id)
              if(msg.user_id === user_id.current){
                return(
                  <View key={msg._id} style={[styles.messageRow,{marginVertical:2,justifyContent: 'flex-end'}]}>
                    <View style={{maxWidth: '75%',gap: 0,alignItems: 'flex-end'}}>
                      {/* <Text style={styles.messageTimeUser}>You • 9:02 AM</Text> */}
                      <LinearGradient
                        colors={['rgba(107, 181, 237, 0.9)', 'rgba(43, 183, 238, 0.7)']}
                        style={{padding: 10,paddingHorizontal:15,borderRadius: 16,borderBottomRightRadius:sameUserBelow?5:16,borderTopRightRadius:sameUserOnTop?5:16}}
                      >
                        <Text style={{color: 'white',fontSize: 18,fontWeight:'600',fontFamily:'Agdasima'}}>{msg.content}</Text>
                      </LinearGradient>
                    </View>
                  </View>
                )
              }
              return (
                  <View key={msg._id} style={[styles.messageRow,{marginVertical:2,position:'relative',marginBottom:!sameUserBelow?20:2}]}>
                    {!sameUserBelow && <Text style={{position:'absolute',bottom:-15,left:0,color:'#999',fontSize:12,fontFamily:'courier',}} >{msg.username}</Text>}
                    <View style={{maxWidth:'80%',}}>
                      {/* <Text style={styles.messageTime}>Super • 9:01 AM</Text> */}
                      <LinearGradient
                        colors={['rgba(34, 149, 57, 0.9)', 'rgba(0, 186, 65, 0.88)']}
                        style={{padding: 10,paddingHorizontal:15,borderRadius: 16,borderBottomLeftRadius:sameUserBelow?5:16,borderTopLeftRadius:sameUserOnTop?5:16}}
                      >
                        <Text style={{color: 'white',fontSize: 18,fontWeight:'600',fontFamily:'Agdasima'}}>
                          {msg.content}
                        </Text>
                      </LinearGradient>
                    </View>
                  </View>
              )
            })
          }
        </ScrollView>

        <Animated.View style={[msgBarStyleAnim,{position:toggleChatPosition?'fixed':'absolute',bottom:toggleChatPosition?0:-40,width:'100%'}]} >
          {userTyping[0] && <View style={{position:'absolute',top:-27,display:'flex',flexDirection:'row',alignItems:'flex-end'}} >
            <Text style={{fontFamily:'Agdasima',color:'white',left:20,fontSize:18,marginBottom:-1}} >{userTyping[0].username} typing</Text>
            <TypingAnimation dotColor='#fff' dotSize={3} />
          </View>}
          <BlurView intensity={40} tint="dark" style={[styles.footer]}>
            <View style={styles.inputContainer}>
              
              
              <View style={styles.inputWrapper}>
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
                        
                  <Image source={require('../../../assets/images/send.svg')} style={{height:22,width:22}} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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