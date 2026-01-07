import { PlusIcon } from '@/assets/svgs/Plus';
import { sleep } from '@/imports/usefull';
import { BlurView } from 'expo-blur';
import { Key } from 'lucide-react-native';
import React, { useState } from 'react';
import {
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




const screen = Dimensions.get('window');

interface Chat {
  id: string;
  name: string;
  key: string;
}

export default function searchChats() {
    const [searchKey, setSearchKey] = useState<string>('');
    const [showAddKey, setShowAddKey] = useState<boolean>(false);
    const [typingOnAdd, setTypingOnAdd] = useState<boolean>(false);
    const [joinedChats, setJoinedChats] = useState<Chat[]>([
        { id: '1', name: 'Project Alpha', key: 'ALPHA-2024-XYZ' },
        { id: '2', name: 'Team Meeting', key: 'MEET-2024-ABC' }
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
        setShowJoinChat(false)
        addButtonOpacity.value = withTiming(1, { duration: 300 })
        addHeight.value = withTiming(70, { duration: 300 })
        addWidth.value = withTiming(70, { duration: 300 })
        await sleep(200)
        addBottom.value = withTiming(70, { duration: 300 })
    }

  return (
    <SafeAreaView style={styles.container}>
      {showJoinChat && !typingOnAdd && (
        <Pressable 
          onPress={closeJoinChat} 
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
                <View style={{display:'flex',flexDirection:'row',alignItems:'center',justifyContent:'start'}} >
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
            <BlurView tint="light" intensity={20} style={{height:'100%',width:'100%',display:'flex',alignItems:'center',justifyContent:'start',paddingVertical:13,paddingHorizontal:13}} >
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