import { Chat } from "@/app/(tabs)";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import jdenticon from "jdenticon/standalone";
import { ArchiveRestore, Trash } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { SvgXml } from "react-native-svg";

interface ChatItem {
    chat : Chat,
    onRemove : (chat : Chat) => void
}

export default function ChatItem({chat,onRemove}: ChatItem){
    const translateX = useSharedValue(0);
    const THRESHOLD = 60;
    const panGestureSender = Gesture.Pan()
        .activeOffsetX([-60, 0])
        .failOffsetY([-10, 10])
        .onUpdate(e => {
          if (e.translationX < 65 && translateX.value > -65) {
            translateX.value = e.translationX;
          }
        })
        .onEnd(() => {
          if (translateX.value < -THRESHOLD) {
            runOnJS(onRemove)(chat);
          }
          translateX.value = withSpring(0);
        });

    

    const animatedStyle = useAnimatedStyle(() => ({
            transform: [{ translateX: translateX.value }],
    }));

    const iconSvg = jdenticon.toSvg(chat.id.slice(16),200)
    const size = 50
    return(
    <View style={{position:'relative'}} >
        <LinearGradient
            colors={['#cf1d1d','#ea5d5d']}
            start={{x:0,y:0}}
            end={{x:1,y:0}}
            style={{position:'absolute',top:0,right:2,height:'100%',width:86,borderTopRightRadius:16,borderBottomRightRadius:16,display:'flex',alignItems:'center',justifyContent:'center'}} >
            <Trash style={{position:"absolute",right:20}} size={30} color={'#fff'} />
        </LinearGradient>
        <LinearGradient
            colors={['#5c7189','#426b8b']}
            start={{x:0,y:0}}
            end={{x:1,y:0}}
            style={{position:'absolute',top:0,left:2,height:'100%',width:86,borderTopLeftRadius:16,borderBottomLeftRadius:16,display:'flex',alignItems:'center',justifyContent:'center'}} >
            <ArchiveRestore style={{position:"absolute",left:20}} size={30} color={'#fff'} />
        </LinearGradient>
        <GestureDetector gesture={panGestureSender}>
            <Animated.View style={[{position:'relative'},animatedStyle]} >
                
                
                <Pressable onPress={()=>router.push({pathname:'/(tabs)/(chat)',params:{chat_id:chat.id,key:chat.key,name:chat.name,description:chat.descrption}})} key={chat.id} style={{zIndex:2,display:'flex',flexDirection:'row',alignItems:'center',backgroundColor: 'rgb(29, 40, 53)',borderRadius:16,padding:16,borderWidth:1,borderColor: '#ffffff1a'}}>
                    <View style={{width:size,height:size,marginRight:10}}>
                        <SvgXml xml={iconSvg} width={size} height={size} />
                    </View>
                    <View style={styles.chatInfo}>
                        <Text style={{fontSize:20,fontFamily:'Agdasima-Bold',color:'white',marginBottom:4}}>{chat.name}</Text>
                        {!chat.last_message&&<Text style={styles.chatKey}>new chat</Text>}
                        {chat.last_message&&<Text numberOfLines={1} style={{fontFamily:'courier',fontSize:14,fontWeight:600,color:'#b4b4b4',}}>{chat.last_sender}<Text style={{color:'#70f33c'}} >{'>'} </Text><Text style={{color:'#ffffff66',fontWeight:400}} >{chat.last_message}</Text></Text>}
                    </View>
                </Pressable>
            </Animated.View>
        </GestureDetector>
    </View>
    
    )
}

const styles = {
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
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
    fontFamily:'Agdasima'
  },
  chatKey: {
    fontSize: 14,
    color: '#ffffff66',
    fontFamily: 'courier',
  },
}