import { BackIcon } from '@/assets/svgs/Back';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

interface messageType {
  id:number,
  text:string,
  by:'user'|'assistant'
}

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

export default function ChatInterface() {
  const navigation = useNavigation();
  const db_ = useRef<SQLite.SQLiteDatabase | null>(null)
  const [tasks, setTasks] = useState<Task[]>([]);
  const [message, setMessage] = useState('');
  const msgTabY = useSharedValue(100)
  const topTabY = useSharedValue(0)
  const messagesTest = [
    {id:0,text:'Analyze tickets from last sprint',by:'user'},
    {id:1,text:'Analyze tickets from last sprint',by:'assistant'},
    {id:2,text:'Analyze tickets from last sprint',by:'user'},
    {id:3,text:'Analyze tickets from last sprint',by:'assistant'},
    {id:4,text:'Analyze tickets from last sprint',by:'user'}

  ]
  const [messages,setMessages] = useState<messageType[]>([])
  const [toggleChatPosition,setToggleChatPosition] = useState(false)
  const scrollViewRef = useRef<ScrollView | undefined>(undefined);
  const [contentHeight, setContentHeight] = useState(0);
  

  useFocusEffect(
    useCallback(() => {
      msgTabY.value = withTiming(0, { duration: 300 })
      topTabY.value = withTiming(100, { duration: 300 })
      scrollToBottomMessages()
      return () => {
      };
    }, [contentHeight])
  );

  useEffect(()=>{
    getTasks()
  },[])

  

  const getTasks = async() =>{
      const db = await SQLite.openDatabaseAsync('super_db');
      db_.current = db;
      const allRows : TaskSQL[] = await db.getAllAsync('SELECT * FROM tasks');
      setTasks([])
      allRows.forEach(e => {
        setTasks(prev => [...prev,{title:e.title,date:e.date,priority:e.priority,id:e.id,completed:e.completed===1,notif_id:e.notif_id}])
      })
      console.log(allRows)
    }

  const scrollToBottomMessages = () =>{
    scrollViewRef.current?.scrollTo({y:contentHeight,x:0, animated: true });
  }

  const goBack = () =>{
    msgTabY.value = withTiming(100, { duration: 300 })
    topTabY.value = withTiming(0, { duration: 300 })
    navigation.goBack()
  }

  const msgBarStyleAnim = useAnimatedStyle(() => ({
    transform: [{translateY:`${msgTabY.value}%`}]
  }));
  const topBarStyleAnim = useAnimatedStyle(() => ({
    transform: [{translateY:`${topTabY.value}%`}]
  }));

  const getId = () =>{
    return parseInt(`${Math.random()*1000000}`)
  }

  const sendMessage = (msg:string) =>{
    setMessage('')
    setMessages(prev=>[...prev,{id:prev.length,text:msg,by:'user'}])
    scrollToBottomMessages()
  }

  const convertMessages = (msgs : messageType[]) =>{
    return msgs.map((m)=>({role:m.by,content:m.text}))
  }

  

  return (
    <SafeAreaView style={styles.container}>
      

      {/* Header */}
      <Animated.View style={[topBarStyleAnim,{position:'absolute',top:-100,width:'100%',zIndex:90}]}  >
        <BlurView intensity={50} tint="dark" style={{paddingHorizontal:20,paddingVertical:10,paddingTop:50,width:'100%',borderBottomWidth:1,borderColor:'#ffffff31'}}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={()=>goBack()} >
                <BackIcon size={35} color='white' />
              </TouchableOpacity>
              <View style={styles.headerText}>
                <Text style={{fontFamily:'Agdasima',fontSize:30,color:'white'}}>SUPER</Text>
              </View>

            </View>
          </View>
        </BlurView>
      </Animated.View>


      {/* Chat Messages */}
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
          contentContainerStyle={{paddingTop:20,paddingBottom:55,paddingHorizontal:20}}
          showsVerticalScrollIndicator={false}
          
        >
          {/* Date Badge */}
          <View style={styles.dateBadgeContainer}>
            <BlurView intensity={40} tint="dark" style={styles.dateBadge}>
              <Text style={styles.dateBadgeText}>TODAY</Text>
            </BlurView>
          </View>

          {
            messages.map((msg,i)=>{
              if(msg.by === "user"){
                return(
                  <View key={msg.id} style={[styles.messageRow, styles.messageRowUser,{marginVertical:5}]}>
                    <View style={styles.messageContentUser}>
                      {/* <Text style={styles.messageTimeUser}>You • 9:02 AM</Text> */}
                      <LinearGradient
                        colors={['rgba(43, 108, 238, 0.9)', 'rgba(43, 108, 238, 0.7)']}
                        style={styles.messageBubbleUser}
                      >
                        <Text style={styles.messageTextUser}>{msg.text}</Text>
                      </LinearGradient>
                    </View>
                  </View>
                )
              }
              return (
                  <View key={msg.id} style={[styles.messageRow,{marginVertical:5}]}>
                    <View style={{width:'80%',borderRadius:16,borderBottomLeftRadius:4,backgroundColor:'#1b1c25ff',overflow:'hidden',borderWidth:1,borderColor:"#ffffff31"}}>
                      {/* <Text style={styles.messageTime}>Super • 9:01 AM</Text> */}
                      <View style={{padding:20}}>
                        <Text style={styles.messageText}>
                          {msg.text}
                        </Text>
                      </View>
                    </View>
                  </View>
              )
            })
          }

          

          {/* User Message */}
          

          {/* AI Message with Tasks
          <View style={styles.messageRow}>
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBDUg8GtsnbvA6Hxe3FmLsvjPWWNCrWJV2mBbYZICJeqVloAxMPu7JLWS8SOs5rX0tcxaewnxAurRBO7Odg0O45a5M88DR2KFYmO88ieoO25uNwVhjaWlEQHJy7Oyr8hhpYQiahMmnTDN3Le45UPup_C5wjZS37gPD1EEFj7V2KhZ6qL3HaZKun0nbd7WI4emPpTXCfGIzLPmj3yqIg7-ICvOwow_UX6nvq_hxTO-R_IryMUrQQ_XvQ08foh6csxFzDqIYrgytjFBPo' }}
              style={styles.messageAvatar}
            />
            <View style={styles.messageContent}>
              <Text style={styles.messageTime}>Super • 9:03 AM</Text>
              <BlurView intensity={40} tint="dark" style={styles.taskBubble}>
                <Text style={styles.messageText}>
                  Great choice. Here's a suggested breakdown for the <Text style={styles.highlight}>Design Review</Text>:
                </Text>
                
                <View style={styles.taskList}>
                  {tasks.map((task, index) => (
                    <TouchableOpacity
                      key={task.id}
                      style={[styles.taskItem, index > 0 && styles.taskItemBorder]}
                      onPress={() => toggleTask(task.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.checkbox}>
                        {task.checked && (
                          <View style={styles.checkboxChecked}>
                            <Text style={styles.checkIcon}>✓</Text>
                          </View>
                        )}
                        {!task.checked && <View style={styles.checkboxUnchecked} />}
                      </View>
                      <View style={styles.taskTextContainer}>
                        <Text style={styles.taskTitle}>{task.title}</Text>
                        <Text style={styles.taskSubtitle}>{task.subtitle}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.addButton}>
                  <Text style={styles.addButtonText}>Add to Task List</Text>
                </TouchableOpacity>
              </BlurView>
            </View>
          </View> */}
        </ScrollView>

        <Animated.View style={[msgBarStyleAnim,{position:toggleChatPosition?'fixed':'absolute',bottom:toggleChatPosition?0:-40,width:'100%'}]} >
          <BlurView intensity={40} tint="dark" style={[styles.footer]}>
            <View style={styles.inputContainer}>
              
              
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Message Super..."
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  onFocus={()=>setToggleChatPosition(true)}
                  onBlur={()=>setToggleChatPosition(false)}
                />
                
              </View>

              <TouchableOpacity onPress={()=>sendMessage(message)} style={{display:'flex',alignItems:'center',justifyContent:'center',padding:10,borderRadius:50,backgroundColor:'#2b6cee'}}>
                {/* <Text style={styles.sendIcon}>↑</Text> */}
                <Image source={require('../../assets/images/send.svg')} style={{height:22,width:22}} />
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
    gap: 12,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
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
  messageContentUser: {
    maxWidth: '75%',
    gap: 4,
    alignItems: 'flex-end',
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
    padding: 16,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    
  },
  messageText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    lineHeight: 22,
    
  },
  messageTextUser: {
    color: 'white',
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