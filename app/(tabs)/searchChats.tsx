import { AscpectIcon } from '@/assets/svgs/Aspect';
import { CameraIcon } from '@/assets/svgs/Camera';
import { PlusIcon } from '@/assets/svgs/Plus';
import { encrypt } from '@/imports/crypto';
import { ip, port } from '@/imports/overall';
import { sleep } from '@/imports/usefull';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BlurView } from 'expo-blur';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import { Key } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Dimensions,
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
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chat } from '.';


const screen = Dimensions.get('window');

export default function searchChats() {
    const token = useRef('')
    const user_id = useRef('')
    const [searchKey, setSearchKey] = useState<string>('');
    const [showAddKey, setShowAddKey] = useState<boolean>(false);
    const [typingOnAdd, setTypingOnAdd] = useState<boolean>(false);
    const [joinedChats, setJoinedChats] = useState<Chat[]>([
        // { id: '1', name: 'Project Alpha', key: 'ALPHA-2024-XYZ',descrption:'',anchor },
        // { id: '2', name: 'Team Meeting', key: 'MEET-2024-ABC' }
    ]);
    const [chatKey,setChatKey] = useState("")
    const addBottom = useSharedValue(70)
    const addHeight = useSharedValue(70)
    const addWidth = useSharedValue(70)
    const addTaskStyleAnim = useAnimatedStyle(() => ({
          bottom: addBottom.value,
          height: addHeight.value,
          width: addWidth.value,
    }));
    const addButtonOpacity = useSharedValue(1)
    const addButtonAnimatedStyle = useAnimatedStyle(() => ({
            opacity : addButtonOpacity.value
    }));
    const addBlurAnimatedStyle = useAnimatedStyle(() => ({
            opacity : 1 - addButtonOpacity.value
    }));
    const [showJoinChat,setShowJoinChat] = useState(false)
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const showCameraRef = useRef(false) // useState isnt fast enough
    const cameraOpacity = useSharedValue(0)
    const cameraStyle = useAnimatedStyle(() => ({
        opacity:cameraOpacity.value
    }));
    const db_ = useRef<SQLite.SQLiteDatabase | null>(null)
    

    const showOnKeyboardAdd = (show : boolean) =>{
          setTypingOnAdd(show)
          if (!showJoinChat) {
            return
          }
          if(show){
            addBottom.value = withTiming(520, { duration: 300 })
            return
          }
          addBottom.value = withTiming(160, { duration: 300 })
          
    }

    
    useEffect(()=>{
      
      AsyncStorage.getItem('token').then((t)=>{
        if (t) {
          token.current = t
          initilizeDB()
        }
      })
      AsyncStorage.getItem('user_id').then((t)=>{
        if (t) {
          user_id.current = t
        }
      })
    },[])

    const initilizeDB = async() =>{
      const db = await SQLite.openDatabaseAsync('super_db');
      db_.current = db;
    }
    

    const formatDate = (date: Date): string => {
        const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
        };
        return date.toLocaleDateString('en-US', options);
    };

    const requestJoinChat = async() =>{
          setShowJoinChat(true)
          addBottom.value = withTiming(160, { duration: 300 })
          addButtonOpacity.value = withTiming(0, { duration: 300 })
          await sleep(200)
          addHeight.value = withTiming(125, { duration: 300 })
          addWidth.value = withTiming(screen.width - 40, { duration: 300 })
    }
    
    const closeJoinChat = async() =>{
        if(!showJoinChat) return
        setShowJoinChat(false)
        addButtonOpacity.value = withTiming(1, { duration: 300 })
        addHeight.value = withTiming(70, { duration: 300 })
        addWidth.value = withTiming(70, { duration: 300 })
        await sleep(200)
        addBottom.value = withTiming(70, { duration: 300 })
    }

    const closeComponents = () =>{
      closeJoinChat()
      setShowCamera(false)
    }

    const scanQR = async() => {
      setShowCamera(true)
      showCameraRef.current = true
      await closeJoinChat()
      cameraOpacity.value = withTiming(1, { duration: 300 })

    }

    const joinChat = async(idkey : string) => {
      if (showCameraRef.current === false) return
      setShowCamera(false)
      showCameraRef.current = false
      const [id,key] = idkey.split('-')
      const anchor = await encrypt(id,key)
      const req = {
        anchor
      }
      try {
        const res = await axios.post(`http://${ip}:${port}/chats/join`,req,{
          headers:{
            Authorization : `Bearer ${token.current}`
          }
        })
        console.log(res.data)
        const chat = res.data
        await addChatSQL({id,anchor,key,name:chat.name,descrption:chat.description})
        router.push({pathname:'/(tabs)/(chat)',params:{chat_id:id,key,name:chat.name,description:chat.descrption}})
      } catch (error) {
        
      }
    }

  const addChatSQL = async(chat : Chat) => {
    await db_.current?.runAsync('INSERT INTO chats (chat_id,anchor,key,name,description,notif_id,user_id) values (?,?,?,?,?,?,?)',[chat.id,chat.anchor,chat.key,chat.name,chat.descrption,user_id.current])
  }

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={{flex:1,backgroundColor:'#101622',display:'flex',alignItems:'center',justifyContent:'center'}} >
        <Text style={{color:'white'}} >Camera permission required</Text>
        <Button title="Grant permission" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {((showJoinChat && !typingOnAdd) || showCamera) && (
        <Pressable 
          onPress={closeComponents} 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 2
          }} 
        />
      )}
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView 
          style={{ position: 'fixed', top: -45, minHeight: screen.height }} 
          contentContainerStyle={{ minHeight: screen.height, paddingTop: 40 }}  
          showsVerticalScrollIndicator={false}
        >
            <View style={styles.header}>
                <Text style={{ fontFamily: 'courier', fontSize: 30, color: 'white' }}>pich</Text>
            </View>

            <View style={styles.greetingSection}>
                <View style={{display:'flex',flexDirection:'row',alignItems:'center',justifyContent:'flex-start'}} >
                    <Text style={styles.greetingText}>
                    Join Chats
                    </Text>
                </View>

                <Text style={styles.dateText}>{formatDate(new Date())}</Text>
            </View>

            <View style={styles.chatsContainer}>
                {joinedChats.map((chat: Chat) => (
                <View key={chat.id} style={styles.chatCard}>
                    <View style={styles.chatIcon}>
                    <Key size={24} color="#fff" />
                    </View>
                    <View style={styles.chatInfo}>
                    <Text style={styles.chatName}>{chat.name}</Text>
                    <Text style={styles.chatKey}>{chat.key}</Text>
                    </View>
                </View>
                ))}
            </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        

        <Animated.View style={[{position:typingOnAdd?'fixed':'absolute',right:typingOnAdd?-20:20,overflow:'hidden',borderRadius:35,borderWidth:1,borderColor:'#ffffff31',zIndex:99},addTaskStyleAnim]} >
            <Animated.View style={addButtonAnimatedStyle} >
                <BlurView tint="light" intensity={20} style={{height:'100%',width:'100%',display:'flex',alignItems:'center',justifyContent:'center'}} >
                <TouchableOpacity onPress={()=>requestJoinChat()} style={{backgroundColor:'rgba(250, 250, 250, 0.09)',borderRadius:'50%',padding:4}} >
                    <PlusIcon size={40} color='#ffffffff' />
                </TouchableOpacity>
                </BlurView>
            </Animated.View>
            <Animated.View style={[{position:'absolute',top:0,left:0,width:'100%',height:'100%'},addBlurAnimatedStyle]} >
            <BlurView tint="light" intensity={20} style={{height:'100%',width:'100%',display:'flex',alignItems:'center',justifyContent:'flex-start',paddingVertical:13,paddingHorizontal:13}} >
                <TouchableOpacity onPress={()=>scanQR()} style={{position:'absolute',top:15,right:20}} >
                    <CameraIcon size={30} color={'rgba(255, 255, 255, 0.12)'} />
                </TouchableOpacity>
                <Text style={{color:"white",fontSize:25,marginBottom:10,fontFamily:'Agdasima-Bold'}} >Join Chat</Text>
                <View style={{display:'flex',flexDirection:'row',width:'100%',justifyContent:'center',marginTop:10,margin:20,gap:10}} >
                    <TextInput onChangeText={setChatKey} value={chatKey} onFocus={()=>showOnKeyboardAdd(true)} placeholder='Key...' onBlur={()=>showOnKeyboardAdd(false)} style={{width:'74%',fontWeight:500,borderRadius:10,borderBottomLeftRadius:23,paddingHorizontal:20,color:'white',paddingVertical:15,backgroundColor:'rgba(255, 255, 255, 0.12)'}} />
                    {/* <TouchableOpacity onPress={()=>closeAddTask()} style={{height:50,width:80,display:'flex',alignItems:'center',justifyContent:'center',backgroundColor:'#ff97977d',borderRadius:10,}} >
                        <Text style={{color:"#f87171ff",fontSize:25,fontFamily:'Agdasima'}} >X</Text>
                    </TouchableOpacity> */}
                    <TouchableOpacity onPress={()=>{}} style={{height:50,width:'25%',display:'flex',alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255, 255, 255, 0.12)',borderRadius:10,borderBottomRightRadius:23}} >
                        <Text style={{color:"#fff",fontSize:25,fontFamily:'Agdasima'}} >join</Text>
                    </TouchableOpacity>
                </View>
            </BlurView>
            </Animated.View>
        </Animated.View>

        
      </KeyboardAvoidingView>

      {showCamera && <Animated.View style={[{position:'absolute',height:screen.width - 40,width:screen.width - 40,bottom:110,right:20,overflow:'hidden',borderRadius:35,borderWidth:1,borderColor:'#ffffff31',zIndex:99},cameraStyle]} >
        <BlurView tint="light" intensity={20} style={{height:'100%',width:'100%',display:'flex',alignItems:'center',justifyContent:'center',paddingVertical:13,paddingHorizontal:13}} >
          {/* <Text style={{color:'#ffffff87',fontSize:18,fontFamily:'Agdasima',width:'85%',marginLeft:10}} numberOfLines={1} >{chatIK}</Text> */}
          <View style={{borderRadius:15,overflow:'hidden',position:'relative',display:'flex',alignItems:'center',justifyContent:'center'}} >
            <CameraView
              style={{ width: screen.width-120,height:screen.width-120}}
              
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={({ data }) => {
                setScanned(true);
                console.log('QR DATA:', atob(data));
                joinChat(atob(data))
              }}
            />
            <View style={{position:'absolute'}} >
              <AscpectIcon color='#ffffff48' size={screen.width-150} />
            </View>
          </View>
        </BlurView>
      </Animated.View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101622',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerLeft: {
    position: 'absolute',
    left: 20,
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
  dateText: {
    fontSize: 14,
    color: '#ffffff87',
    marginTop: 5,
  },
  sectionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  chatsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ffffff1a',
  },
  chatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  chatKey: {
    fontSize: 14,
    color: '#ffffff66',
    fontFamily: 'courier',
  },
});