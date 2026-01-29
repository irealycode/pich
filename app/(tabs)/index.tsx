import { CopyIcon } from '@/assets/svgs/Copy';
import { PlusIcon } from '@/assets/svgs/Plus';
import { ProfileIcon } from '@/assets/svgs/Profile';
import ChatItem from '@/components/ui/ChatItem';
import { decrypt, encryptECB } from '@/imports/crypto';
import { ip, port } from '@/imports/overall';
import { randomKey, sleep } from '@/imports/usefull';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BlurView } from 'expo-blur';
import * as Notifications from 'expo-notifications';
import { router, useFocusEffect } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import jdenticon from "jdenticon/standalone";
import { LogOut } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

interface Task {
  id : number,
  title : string,
  date : `${number}/${number}/${number}`,
  priority : string,
  completed : boolean,
  notif_id : string,
}


export interface Chat {
  id: string;
  name: string;
  descrption: string;
  anchor:string;
  key: string;
  last_message?: string;
  last_sender?: string;
}

interface ChatSQL {
  id: string;
  chat_id: string;
  name: string;
  descrption: string;
  anchor:string;
  key: string;
  user_id:string;
}

interface ConfirmationParams{
  type : 'info' | 'urgent'
  onYes : () => void
  onNo : () => void
}

const screen = Dimensions.get("screen")





const ChatPich = () => {
  
    const [showAddTask,setShowAddTask] = useState(false)
    const [typingOnAdd,setTypingOnAdd] = useState(false)
    const db_ = useRef<SQLite.SQLiteDatabase | null>(null)
    const [chatName,setChatName] = useState("")
    const addBottom = useSharedValue(70)
    const addHeight = useSharedValue(70)
    const addWidth = useSharedValue(70)
    const addButtonOpacity = useSharedValue(1)
    const [joinedChats, setJoinedChats] = useState<Chat[]>([])
    const addTaskStyleAnim = useAnimatedStyle(() => ({
        bottom: addBottom.value,
        height: addHeight.value,
        width: addWidth.value,
    }));
    const addButtonAnimatedStyle = useAnimatedStyle(() => ({
        opacity : addButtonOpacity.value
    }));
    const addBlurAnimatedStyle = useAnimatedStyle(() => ({
        opacity : 1 - addButtonOpacity.value
    }));
    
    const keyCopyOpacity = useSharedValue(0)
    const keyCopyStyle = useAnimatedStyle(() => ({
        opacity:keyCopyOpacity.value
    }));
    const [chatIK,setChatIK] = useState('')
    const [showCopy,setShowCopy] = useState(false)
    const [showedProfile,setShowedProfile] = useState(false)
    const token = useRef('')
    const user_id = useRef('')
    const username = useRef('')
    const [showConfirmation,setShowConfirmation] = useState<ConfirmationParams | null>(null)
    const showProfileScale = useSharedValue(0)
    const showProfileStyle = useAnimatedStyle(()=>({
        transform: [{ scale: showProfileScale.value }],
      }))

    useFocusEffect(
      useCallback(() => {
        getChats()
        
        return () => {
        };
      }, [])
    );

    useEffect(() => {
      AsyncStorage.getItem('token').then((t)=>{
          if (t) {
            token.current = t
            AsyncStorage.getItem('user_id').then((u)=>{
              if (u) {
                user_id.current = u
                getChatsAndLastMessages()
                AsyncStorage.getItem('username').then((us)=>{
                  if (us) {
                    username.current = us
                  }
                })
              }
            })
          }
        })
    // const configureNotificationsAsync = async () => {
    //   const { granted } = await Notifications.requestPermissionsAsync();
    //   if (!granted) {
    //     return console.warn("⚠️ Notification Permissions not granted!");
    //   }

    //   Notifications.setNotificationHandler({
    //     handleNotification: async () => ({
    //       shouldPlaySound: true,
    //       shouldSetBadge: false,
    //       shouldShowBanner: true,
    //       shouldShowList: true,
    //     }),
    //   });
    // };
    // configureNotificationsAsync();
    
    }, []);

  

  const getChats = async() =>{
      const db = await SQLite.openDatabaseAsync('super_db');
      db_.current = db;
      const allRows : ChatSQL[] = await db.getAllAsync('SELECT * FROM chats WHERE user_id = ?',[user_id.current]);
      setJoinedChats([])
      allRows.forEach(async e =>{
        setJoinedChats(prev => [...prev,{...e,id:e.chat_id}])
      })
      console.log(allRows)
    }

    const getChatsAndLastMessages = async() =>{
      const db = await SQLite.openDatabaseAsync('super_db');
      db_.current = db;
      const allRows : ChatSQL[] = await db.getAllAsync('SELECT * FROM chats WHERE user_id = ?',[user_id.current]);
      setJoinedChats([])
      allRows.forEach(async e =>{
        // this way has to change when the app grows

        const res = await axios.get(`http://${ip}:${port}/messages/latest/${e.chat_id}`,{
            headers:{
              Authorization : `Bearer ${token.current}`
            }
        })
        if (res.status === 200) {
          const content = res.data.content
          const user = res.data.username
          const last_message = decrypt(content,e.key)
          setJoinedChats(prev => [...prev,{...e,id:e.chat_id,last_message:last_message,last_sender:user}])
          db.runAsync("UPDATE chats SET last_message = ? , last_sender = ? WHERE chat_id = ?",[last_message,user,e.chat_id])
        }else if(res.status === 201){
          setJoinedChats(prev => [...prev,{...e,id:e.chat_id}])
        }
      })
      console.log(allRows)
    }

    const sendNotification = (title:string, body:string) => {
      Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1,
        },
      });
    };

    async function scheduleTaskReminder(taskId: number,title : string) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Task reminder',
          body: title,
          data: { taskId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 60,
          repeats: true,
        },
      });

      return id
    }

    async function cancelTaskReminder(notificationId: string) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    }


    const formatDateToString = (date : Date) : `${number}/${number}/${number}` => {
      return `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`
    }
    const today = formatDateToString(new Date())

    function formatDate(date: Date): string {
      const day = date.toLocaleDateString("en-US", { weekday: "long" });
      const monthName = date.toLocaleDateString("en-US", { month: "long" });

      const monthNumber = String(date.getMonth() + 1).padStart(2, "0");

      return `${day}, ${monthName} ${monthNumber}`;
    }
    

    const requestAddTask = async() =>{
      setShowAddTask(true)
      addBottom.value = withTiming(160, { duration: 300 })
      addButtonOpacity.value = withTiming(0, { duration: 300 })
      await sleep(200)
      addHeight.value = withTiming(125, { duration: 300 })
      addWidth.value = withTiming(screen.width - 40, { duration: 300 })
    }

    const closeAddTask = async() =>{
      setShowAddTask(false)
      addButtonOpacity.value = withTiming(1, { duration: 300 })
      addHeight.value = withTiming(70, { duration: 300 })
      addWidth.value = withTiming(70, { duration: 300 })
      await sleep(200)
      addBottom.value = withTiming(70, { duration: 300 })
    }

    const showOnKeyboardAdd = (show : boolean) =>{
      setTypingOnAdd(show)
      if (!showAddTask) {
        return
      }
      if(show){
        addBottom.value = withTiming(520, { duration: 300 })
        return
      }
      addBottom.value = withTiming(160, { duration: 300 })
      
    }

   

    const createChat = async() =>{
      if (chatName.trim() === "") return
      const key = randomKey()
      // const k = "p!Ch-JcXPfNVA@@x-FEI#xKE9KL-%&t6mLjsQ5-yN6T$J0&%Z-Prr9#IkDR"
      
      // console.log(key)
      // const c = await encrypt('hello',key)
      // const d = await decrypt(c,key)

      const req = {
        name : chatName.trim(),
        descrption : 'your own pich chat !',
      }

      try {
        
        if(token.current === '') {
          await AsyncStorage.clear()
          router.replace('/(auth)')
        }
        const res = await axios.post(`http://${ip}:${port}/chats`,req,{
          headers:{
            Authorization : `Bearer ${token.current}`
          }
        })
        const data = res.data
        const anchor = await encryptECB(data._id,key)
        const req1 = {
          chat_id : data._id,
          anchor
        }
        console.log(req1)
        const res1 = await axios.post(`http://${ip}:${port}/chats/anchor`,req1,{
          headers:{
            Authorization : `Bearer ${token.current}`
          }
        })
        const idkey =  btoa(`${data._id}-${key}`)
        setChatIK(idkey)
        console.log(res1.data)
        const chat : Chat = {
          id : data._id,
          anchor,
          key,
          name : req.name,
          descrption : req.descrption
        }
        addChatSQL(chat)
      } catch (error) {
        console.error(error)
      }
      setChatName('')
      
      setShowCopy(true)
      Keyboard.dismiss()
      closeAddTask()
      await sleep(300)
      keyCopyOpacity.value = withTiming(1, { duration: 300 })
      await getChats()
      await sleep(5300)
      keyCopyOpacity.value = withTiming(0, { duration: 300 })
      await sleep(300)
      setShowCopy(false)
    }

    const addChatSQL = async(chat : Chat) => {
      await db_.current?.runAsync('INSERT INTO chats (chat_id,anchor,key,name,description,notif_id,user_id) values (?,?,?,?,?,?,?)',[chat.id,chat.anchor,chat.key,chat.name,chat.descrption,"none",user_id.current])
    }

    const logOut = () =>{
      AsyncStorage.clear()
      router.replace('/(auth)')
    }

    const onRemove = (chat : Chat) => {
      console.log('removed')
      setShowConfirmation({
        type : 'urgent',
        onYes: () => {
          db_.current?.runAsync('DELETE from chats WHERE chat_id = ? AND user_id = ?',[chat.id,user_id.current]).then(()=>{
            setShowConfirmation(null)
            getChats()
          })
        },
        onNo : () => {
          setShowConfirmation(null)
        }
      })
    }

    const showProfile = () =>{
      setShowedProfile(true)
      showProfileScale.value = 0
      setTimeout(()=>{
          showProfileScale.value = withSpring(1, { damping:60 })
      },200)
    }

    const closeAllPrimary = () =>{
      setShowConfirmation(null)
      setShowedProfile(false)
    }
    
    
    const profileSvg = jdenticon.toSvg(user_id.current?.slice(16),200)
    return (
      <SafeAreaView style={styles.container}>
        {/* <StatusBar barStyle="light-content" /> */}
        {showAddTask && !typingOnAdd && <Pressable onPress={()=>closeAddTask()} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',zIndex:2}} >
        </Pressable>}

        {(showConfirmation || showedProfile) && <Pressable onPress={()=>closeAllPrimary()} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',zIndex:3}} >
          <BlurView intensity={40} style={{height:'100%',width:'100%'}} >
          </BlurView>
        </Pressable>}

        {showedProfile && <Animated.View style={[{position:'absolute',top:100,right:20,height:115,width:200,borderRadius:16,zIndex:4,borderWidth:1,borderColor:'#afafaf44',backgroundColor:'#2626262b'},showProfileStyle]} >
                <View style={{display:'flex',overflow:'hidden',alignItems:'flex-start',paddingHorizontal:15,justifyContent:'center',width:'100%',flexDirection:'column',position:'absolute',bottom:12,gap:10}} >
                    <View  style={{display:'flex',alignItems:'center',flexDirection:'row',gap:10}} >
                        <SvgXml xml={profileSvg} width={30} height={30} />
                        <Text numberOfLines={1} style={{color:'#ffffff',fontSize:20,width:'80%',fontWeight:600,fontFamily:'Agdasima'}} >{username.current}</Text>
                    </View>
                    <View style={{height:2,width:'80%',marginLeft:'10%',backgroundColor:'#9999996e',marginVertical:4,borderRadius:2}} ></View>
                    <TouchableOpacity onPress={()=>logOut()} style={{display:'flex',alignItems:'center',flexDirection:'row',gap:10}} >
                        <LogOut width={30} height={30} color={'#ff4b4b'} />
                        <Text numberOfLines={1} style={{color:'#ffffff',fontSize:20,width:'80%',fontWeight:600,fontFamily:'Agdasima'}} >Log out</Text>
                    </TouchableOpacity>
                </View>
          </Animated.View>}
        

        {showConfirmation &&
        <View style={{position:'absolute',zIndex:4,top:'50%',left:'50%',transform:'translateX(-100%) translateY(-50%)',paddingTop:20,paddingBottom:10,paddingHorizontal:10,width:200,backgroundColor:'rgba(150, 171, 190, 0.21)',borderRadius:16,borderWidth:1,borderColor:"#5a5a5a92",display:'flex',alignItems:'center',justifyContent:'center'}} >
          <Text style={{color:'white',fontFamily:'Agdasima-Bold',fontSize:23}} >Are you sure?</Text>
          <View style={{display:'flex',flexDirection:'row',alignItems:'center',justifyContent:'center',marginTop:40}} >
              <TouchableOpacity onPress={()=>showConfirmation.onNo()} style={{width:'50%',display:'flex',alignItems:'center',justifyContent:'center',}} >
                <Text style={{color:'white',fontFamily:'Agdasima-Bold',fontSize:23}} >No</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=>showConfirmation.onYes()} style={{width:'50%',display:'flex',alignItems:'center',justifyContent:'center',backgroundColor:showConfirmation.type === 'info'?'#ffffff23':'#ff6f6fb1',borderRadius:13,paddingVertical:10}} >
                <Text style={{color:'white',fontFamily:'Agdasima-Bold',fontSize:23}} >Yes</Text>
              </TouchableOpacity>
          </View>
        </View>}
        
        <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                // style={{flex:1}}
                keyboardVerticalOffset={0}
              >
          <ScrollView style={{position:'fixed',top:-45,minHeight:screen.height}} contentContainerStyle={{minHeight:screen.height,paddingTop:40}}  showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <TouchableOpacity onPress={()=>logOut()} style={styles.headerLeft}>
                <Text style={{fontFamily:'courier',fontSize:30,color:'white',margin:0}}>pich</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={()=>showProfile()} style={{position:'absolute',top:55,right:20}}>
              <ProfileIcon size={30} color='white' />
            </TouchableOpacity>

            <View style={styles.greetingSection}>
              <View style={{display:'flex',flexDirection:'row',alignItems:'center',justifyContent:'flex-start'}} >
                <Text style={styles.greetingText}>
                  Chats
                </Text>
                <TouchableOpacity onPress={()=>requestAddTask()} style={[styles.sectionBadge,{marginLeft:10}]}>
                  <Text style={styles.sectionBadgeText}>{joinedChats.length}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.dateText}>{formatDate(new Date())}</Text>
            </View>

            {/* <View style={styles.productivityCard}>
              <View style={styles.productivityHeader}>
                <View>
                  <Text style={styles.productivityLabel}>Daily Productivity</Text>
                  <Text style={styles.productivityValue}>{productivity}%</Text>
                </View>
                <View style={styles.productivityBadge}>
                  <Text style={styles.productivityBadgeText}>
                    {completedTasks} of {totalTasks} tasks
                  </Text>
                </View>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${productivity}%` }]} />
              </View>
            </View> */}

            <View style={styles.chatsContainer}>
                {joinedChats.map((chat: Chat) => {
                  
                  return(
                    <ChatItem key={chat.id} chat={chat} onRemove={onRemove} />
                )})}
            </View>

            

            <View style={{ height: 100 }} />
          </ScrollView>

          
          <Animated.View style={[{position:typingOnAdd?'fixed':'absolute',right:typingOnAdd?-20:20,overflow:'hidden',borderRadius:35,borderWidth:1,borderColor:'#ffffff31',zIndex:99},addTaskStyleAnim]} >
              <Animated.View style={addButtonAnimatedStyle} >
                  <BlurView tint="light" intensity={20} style={{height:'100%',width:'100%',display:'flex',alignItems:'center',justifyContent:'center'}} >
                    <TouchableOpacity onPress={()=>requestAddTask()} style={{backgroundColor:'rgba(250, 250, 250, 0.09)',borderRadius:'50%',padding:4}} >
                      <PlusIcon size={40} color='#ffffffff' />
                    </TouchableOpacity>
                  </BlurView>
              </Animated.View>
              <Animated.View style={[{position:'absolute',top:0,left:0,width:'100%',height:'100%'},addBlurAnimatedStyle]} >
                <BlurView tint="light" intensity={20} style={{height:'100%',width:'100%',display:'flex',alignItems:'center',justifyContent:'flex-start',paddingVertical:13,paddingHorizontal:13}} >
                    <Text style={{color:"white",fontSize:25,marginBottom:10,fontFamily:'Agdasima-Bold'}} >Create Chat</Text>
                    <View style={{display:'flex',flexDirection:'row',width:'100%',justifyContent:'center',marginTop:10,margin:20,gap:10}} >
                      <TextInput onChangeText={setChatName} value={chatName} onFocus={()=>showOnKeyboardAdd(true)} placeholder='Chat Name...' onBlur={()=>showOnKeyboardAdd(false)} style={{width:'74%',fontWeight:500,borderRadius:10,borderBottomLeftRadius:23,paddingHorizontal:20,color:'white',paddingVertical:15,backgroundColor:'rgba(255, 255, 255, 0.12)'}} />
                        {/* <TouchableOpacity onPress={()=>closeAddTask()} style={{height:50,width:80,display:'flex',alignItems:'center',justifyContent:'center',backgroundColor:'#ff97977d',borderRadius:10,}} >
                          <Text style={{color:"#f87171ff",fontSize:25,fontFamily:'Agdasima'}} >X</Text>
                        </TouchableOpacity> */}
                        <TouchableOpacity onPress={()=>createChat()} style={{height:50,width:'25%',display:'flex',alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255, 255, 255, 0.12)',borderRadius:10,borderBottomRightRadius:23}} >
                          <Text style={{color:"#fff",fontSize:25,fontFamily:'Agdasima'}} >create</Text>
                        </TouchableOpacity>
                    </View>
                </BlurView>
              </Animated.View>
          </Animated.View>
          {showCopy && <Animated.View style={[{position:'absolute',height:screen.width - 40,width:screen.width - 40,bottom:160,right:20,overflow:'hidden',borderRadius:35,borderWidth:1,borderColor:'#ffffff31',zIndex:99},keyCopyStyle]} >
            <BlurView tint="light" intensity={20} style={{height:'100%',width:'100%',display:'flex',alignItems:'center',justifyContent:'center',paddingVertical:13,paddingHorizontal:13}} >
              {/* <Text style={{color:'#ffffff87',fontSize:18,fontFamily:'Agdasima',width:'85%',marginLeft:10}} numberOfLines={1} >{chatIK}</Text> */}
              <View style={{borderRadius:15,overflow:'hidden'}} >
                <QRCode
                  value={chatIK}
                  size={screen.width-120}
                  logoBackgroundColor="transparent"
                  backgroundColor='rgba(129, 129, 129, 0)'
                  color='white'
                  logoBorderRadius={10}
                />
              </View>
              
              <TouchableOpacity style={{position:'absolute',right:15,bottom:15}} >
                <CopyIcon size={25} color='#fff' />
              </TouchableOpacity>
            </BlurView>
          </Animated.View>}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101622',
  },
  backgroundGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  glowCircle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  glow1: {
    top: '-10%',
    left: '-20%',
    width: '70%',
    height: '30%',
    backgroundColor: 'rgba(43, 108, 238, 0.15)',
  },
  glow2: {
    top: '40%',
    right: '-20%',
    width: '60%',
    height: '35%',
    backgroundColor: 'rgba(147, 51, 234, 0.08)',
  },
  glow3: {
    bottom: '-10%',
    left: '20%',
    width: '50%',
    height: '25%',
    backgroundColor: 'rgba(96, 165, 250, 0.08)',
  },
  scrollView: {
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
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
    backgroundColor: '#2b6cee',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#101622',
  },
  headerText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationIcon: {
    fontSize: 20,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  greetingSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 36,
    margin:0
  },
  greetingName: {
    color: '#60a5fa',

  },
  dateText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 4,
  },
  productivityCard: {
    marginHorizontal: 24,
    marginVertical: 16,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  productivityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  productivityLabel: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  productivityValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
  productivityBadge: {
    backgroundColor: 'rgba(43, 108, 238, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(43, 108, 238, 0.2)',
  },
  productivityBadgeText: {
    color: '#2b6cee',
    fontSize: 11,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(71, 85, 105, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2b6cee',
    borderRadius: 4,
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  sectionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionBadgeText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '400',
  },
  taskCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#475569',
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2b6cee',
    borderColor: '#2b6cee',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  taskContent: {
    flex: 1,
    marginLeft: 12,
  },
  taskTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 6,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeIcon: {
    fontSize: 12,
  },
  timeText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  aiSuggestionContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  aiSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(43, 108, 238, 0.3)',
  },
  aiIcon: {
    fontSize: 14,
  },
  aiText: {
    color: '#dbeafe',
    fontSize: 12,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 96,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2b6cee',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2b6cee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  fabIcon: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '300',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 80,
    backgroundColor: 'rgba(16, 22, 34, 0.7)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  navIcon: {
    fontSize: 24,
    color: '#94a3b8',
  },
  navIconActive: {
    color: '#2b6cee',
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94a3b8',
    marginTop: 4,
  },
  navLabelActive: {
    color: '#2b6cee',
  },
  chatsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  
});

export default ChatPich;