import { CopyIcon } from '@/assets/svgs/Copy';
import Toasty, { ToastyIN } from '@/components/ui/toast';
import { ip, port } from '@/imports/overall';
import { authenticate, replaceWith } from '@/imports/usefull';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BlurView } from 'expo-blur';
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from 'expo-router';
import jdenticon from "jdenticon/standalone";
import { ArrowLeft, Key, Share2, Users } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
const screen = Dimensions.get('window');

interface chatInfoInterface {
    name: string;
    description: string;
    chatKey: string;
    users: {
        id: string;
        username: string;
        isAdmin: boolean;
    }[];
}

export default function ChatDetailsScreen () {
    const [showQR, setShowQR] = useState(false);
    const token = useRef('')
    const user_id = useRef('')
    const {chat_id,key,name,description} = useLocalSearchParams<{ chat_id:string,key:string, name: string,description:string }>()
    const [toast,setToast] = useState<ToastyIN | null>(null)
    const chatDataInit = {
        name,
        description,
        chatKey:`${chat_id}-${key}`,
        users: [],
    };
    const [chatData,setChatData] = useState<chatInfoInterface>(chatDataInit)

    const qrScale = useSharedValue(0);
    const qrOpacity = useSharedValue(0);


    useEffect(()=>{
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
    },[])

    const getChat = async() => {
        const res = await axios.get(`http://${ip}:${port}/chats/${chat_id}`,{
          headers:{
            Authorization : `Bearer ${token.current}`
          }
        })
        const data = res.data
        const users = data.joined_users
        setChatData(prev => ({...prev,users:users.map((u : {username : string, id : string})=>({username:u.username,id:u.id,isAdmin:u.id === data.admin_id}))}))
        console.log(res.data)
    }

    const toggleQR = () => {
        if (!showQR) {
        setShowQR(true);
        qrScale.value = withTiming(1, { duration: 200 });
        qrOpacity.value = withTiming(1, { duration: 200 });
        } else {
        qrScale.value = withTiming(0, { duration: 150 });
        qrOpacity.value = withTiming(0, { duration: 150 });
        setTimeout(() => setShowQR(false), 200);
        }
    }

    const qrAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: qrScale.value }],
        opacity: qrOpacity.value,
    }));

    const copy = async() => {
        await Clipboard.setStringAsync(chatDataInit.chatKey);
        sendToast("info","Key copied.")
    }

    const failedAuth = (reason : string) => {
        console.log("failed : ",reason)
        sendToast("error",reason)
    }

    const requestCopy = async() => {
        await authenticate({onSuccess:copy,onFailure:failedAuth})
    }

    const requestShare = async() => {
        await authenticate({onSuccess:()=>{toggleQR()},onFailure:failedAuth})
    }

    const sendToast = (type : 'success'|'error'|'warning'|'info',message : string) =>{
        setToast({type,message})
        setTimeout(()=>{
        setToast(null)
        },5300)
    }

  return (
    <SafeAreaView style={styles.container}>
        {toast && <Toasty type={toast.type} message={toast.message} />}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={()=>router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat Details</Text>
          <View style={[styles.backButton,{opacity:0}]} />
        </View>

        <View style={styles.infoCard}>
          <View style={{}}>
            <SvgXml xml={jdenticon.toSvg(chat_id.slice(16),200)} width={80} height={80} />
          </View>
          
          <Text style={styles.chatNameLarge}>{chatData.name}</Text>
          
          {chatData.description && (
            <Text style={styles.chatDescription}>{chatData.description}</Text>
          )}

          <TouchableOpacity onPress={()=>requestShare()} style={styles.shareButton}>
            <Share2 size={20} color="#2b6cee" />
            <Text style={styles.shareButtonText}>Share Chat</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={20} color="#94a3b8" />
            <Text style={styles.sectionTitle}>Members</Text>
            <View style={styles.memberBadge}>
              <Text style={styles.memberBadgeText}>{chatData.users.length}</Text>
            </View>
          </View>

          <View style={styles.membersContainer}>
            {chatData.users.map((user) => {
            const iconSvg = jdenticon.toSvg(user.id.slice(16),200)
            const size = 50
            return(
              <View key={user.id} style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: user.id === user_id.current?'rgba(130, 255, 144, 0.03)':'rgba(255, 255, 255, 0.03)',
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: user.id === user_id.current?'rgba(24, 255, 58, 0.08)':'rgba(255, 255, 255, 0.08)',
                }}>
                <View style={{width:50,height:50,overflow:'hidden',marginRight:10}}>
                  <SvgXml xml={iconSvg} width={size} height={size} />
                </View>
                
                <View style={styles.memberInfo}>
                  <View style={styles.memberNameRow}>
                    <Text style={[styles.memberName,{color:user.id === user_id.current?'#26dc3b':'#fff'}]}>$ <Text style={{color:'#fff'}}>{user.username}</Text></Text>
                    {user.isAdmin && (
                      <View style={styles.adminBadge}>
                        <Text style={styles.adminText}>Admin</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )})}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Key size={20} color="#94a3b8" />
            <Text style={styles.sectionTitle}>Chat Key</Text>
          </View>

          <View style={styles.keyCard}>
            <Text style={styles.keyText} numberOfLines={1}>
              {replaceWith(chatData.chatKey,"#")}
            </Text>
          </View>
          <TouchableOpacity onPress={()=>requestCopy()} style={{position:'absolute',right:35,bottom:10,backgroundColor:'#18202f',borderRadius:6}} >
            <CopyIcon size={25} color='#9fb3d0' />
        </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {showQR && (
        <Animated.View style={[styles.qrContainer, qrAnimatedStyle]}>
          <BlurView
            tint="light"
            intensity={20}
            style={styles.qrBlur}
          >
            <Text style={styles.qrTitle}>Share Chat</Text>
            <Text style={styles.qrSubtitle}>Scan to join {chatData.name}</Text>
            
            <View style={styles.qrWrapper}>
              <QRCode
                value={btoa(chatData.chatKey)}
                size={screen.width - 140}
                backgroundColor="rgba(129, 129, 129, 0)"
                color="white"
                logoBackgroundColor="transparent"
              />
            </View>
            
            <TouchableOpacity onPress={toggleQR} style={styles.qrCloseButton}>
              <Text style={styles.qrCloseText}>Close</Text>
            </TouchableOpacity>
          </BlurView>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101622',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 98,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Agdasima',
  },
  infoCard: {
    marginHorizontal: 24,
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    marginBottom: 24,
  },
  chatIconLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(43, 108, 238, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(43, 108, 238, 0.3)',
  },
  chatNameLarge: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    fontFamily: 'Agdasima-Bold',
  },
  chatDescription: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(43, 108, 238, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(43, 108, 238, 0.3)',
  },
  shareButtonText: {
    color: '#60a5fa',
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
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
  memberBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  memberBadgeText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '400',
  },
  membersContainer: {
    gap: 12,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(43, 108, 238, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 20,
    fontWeight: '500',
    color: '#ffffff',
    fontFamily:'Agdasima'
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  adminText: {
    color: '#22c55e',
    fontSize: 10,
    fontWeight: '600',
  },
  keyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  keyText: {
    color: '#94a3b8',
    fontSize: 13,
    fontFamily: 'courier',
  },
  qrContainer: {
    position: 'absolute',
    alignSelf: 'center',
    width: screen.width - 40,
    top: '50%',
    marginTop: -(screen.width - 40) / 2,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ffffff31',
    zIndex: 99,
  },
  qrBlur: {
    width: '100%',
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  qrTitle: {
    color: 'white',
    fontSize: 28,
    marginBottom: 4,
    fontFamily: 'Agdasima-Bold',
  },
  qrSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 24,
  },
  qrWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    padding: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 24,
  },
  qrCloseButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
  },
  qrCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
