import { Message } from "@/app/(tabs)/(chat)";
import { LikeIcon } from "@/assets/svgs/Like";
import { ReplyLineIcon } from "@/assets/svgs/ReplyLine";
import { LinearGradient } from "expo-linear-gradient";
import jdenticon from "jdenticon/standalone";
import { useRef } from "react";
import { Dimensions, Pressable, Text, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { SvgXml } from "react-native-svg";

const screen = Dimensions.get('screen')

interface MessageBubbleType {
    message : Message, 
    onReply : (message : Message) => void,
    onLike : (message : Message) => void,
    onUnLike : (message : Message) => void,
    sameUserBelow : boolean,
    sameUserOnTop : boolean,
    bySender : boolean,
    user_id : string
}

export default function MessageBubble({ message, onReply, onLike, onUnLike, sameUserBelow, sameUserOnTop, bySender, user_id } : MessageBubbleType) {
    const translateX = useSharedValue(0);
    const likeScale = useSharedValue(1);
    const lastPress = useRef(0);
    const THRESHOLD = 60;
    const DOUBLE_PRESS_DELAY = 300;
    const panGestureSender = Gesture.Pan()
    .onUpdate(e => {
      if (e.translationX < 0 && translateX.value > -65) {
        translateX.value = e.translationX;
      }
    })
    .onEnd(() => {
      if (translateX.value < -THRESHOLD) {
        runOnJS(onReply)(message);
      }
      translateX.value = withSpring(0);
    });

    const panGestureUser = Gesture.Pan()
    .onUpdate(e => {
      if (e.translationX > 0 && translateX.value < 65) {
        translateX.value = e.translationX;
      }
    })
    .onEnd(() => {
      if (translateX.value > THRESHOLD) {
        runOnJS(onReply)(message);
      }
      translateX.value = withSpring(0);
    });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));
    const likeStyle = useAnimatedStyle(() => ({
        transform: [{ scale: likeScale.value }],
    }));

    const handlePress = (msg : Message) => {
        const now = Date.now();

        if (now - lastPress.current < DOUBLE_PRESS_DELAY) {
            onLike(msg)
            likeScale.value = withSequence(
                withTiming(1.4, { duration:300 }),
                withSpring(1, { damping: 12 })
            );
        }

        lastPress.current = now;
    };

    const mock_user = ["39023875756029346023467","390238757560201942385710978346","3902387575602356134514613723564","39023875756023456843568243652345"]
//   message.likes = [mock_user]
  if(bySender) {
    return(
    <Animated.View key={message._id} style={[{marginVertical:2,justifyContent: 'flex-end',flexDirection: 'row',alignItems: 'flex-end',gap: 5,display:'flex'},animatedStyle]}>
        <GestureDetector gesture={panGestureSender}>
            <Pressable  onPress={()=>handlePress(message)} style={{maxWidth: '75%',gap: 0,alignItems: 'flex-end',position:'relative',paddingTop:message.reply?43:0,paddingBottom:(message.likes && message.likes.length > 0)?10:0}}>
                {(message.likes && message.likes.length > 0) && 
                    <TouchableOpacity onPress={()=>onUnLike(message)} style={{position:'absolute',bottom:-5,right:10,backgroundColor:'#101622',padding:5,zIndex:99,borderRadius:10,display:'flex',flexDirection:'row',alignItems:'center',justifyContent:'flex-end'}} >
                        {message.likes.map((usr)=>{
                            const iconSvg = jdenticon.toSvg(usr.slice(16),200)
                            const size = 15
                            return(
                                <View key={usr} >
                                    <SvgXml xml={iconSvg} width={size} height={size} />
                                </View>
                            )
                        })}
                        <Animated.View style={[likeStyle]} >
                            <LikeIcon size={15} color="#fe3e3e" />
                        </Animated.View>
                    </TouchableOpacity>
                }
                {message.reply &&
                    <View style={{height:43,position:'absolute',opacity:0.7}} >
                        <View style={{transform:"scaleX(-1)",position:'absolute',bottom:0,right:-3}} >
                            <ReplyLineIcon size={35} color="rgba(79, 111, 151, 0.54)" />
                        </View>
                        <LinearGradient
                        colors={user_id === message.reply.user_id ?['rgba(107, 181, 237, 0.9)', 'rgba(43, 183, 238, 0.7)']:['rgba(34, 149, 57, 0.9)', 'rgba(0, 186, 65, 0.88)']}
                        style={{padding: 6,paddingHorizontal:10,borderRadius: 10,position:'absolute',right:25,top:5,display:'flex',maxWidth:screen.width*0.6}}
                        >
                            <Text numberOfLines={1} style={{color: 'white',fontSize: 12,fontWeight:'600',fontFamily:'Agdasima'}}>{message.reply.content}</Text>
                        </LinearGradient>
                    </View>
                }
                {/* <Text style={styles.messageTimeUser}>You • 9:02 AM</Text> */}
                <LinearGradient
                colors={['rgba(107, 181, 237, 0.9)', 'rgba(43, 183, 238, 0.7)']}
                style={{padding: 10,paddingHorizontal:15,borderRadius: 16,borderBottomRightRadius:sameUserBelow?5:16,borderTopRightRadius:sameUserOnTop?5:16}}
                >
                <Text style={{color: 'white',fontSize: 18,fontWeight:'600',fontFamily:'Agdasima'}}>{message.content}</Text>
                </LinearGradient>
            </Pressable>
        </GestureDetector>
    </Animated.View>
    )
  }

  return (
    <Animated.View key={message._id} style={[{marginVertical:2,position:'relative',marginBottom:!sameUserBelow?20:2,flexDirection: 'row',alignItems: 'flex-end',gap: 5},animatedStyle]}>
        {!sameUserBelow && <Text style={{position:'absolute',bottom:-15,left:0,color:'#999',fontSize:12,fontFamily:'courier',}} >{message.username}</Text>}
        <GestureDetector gesture={panGestureUser}>
            <Pressable onPress={()=>handlePress(message)} style={{maxWidth:'80%',paddingTop:message.reply?43:0,paddingBottom:(message.likes && message.likes.length > 0)?10:0}}>
                {(message.likes && message.likes.length > 0) && 
                    <TouchableOpacity onPress={()=>onUnLike(message)} style={{position:'absolute',bottom:-5,left:10,backgroundColor:'#101622',padding:5,zIndex:99,borderRadius:10,display:'flex',flexDirection:'row',alignItems:'center',justifyContent:'flex-start'}} >
                        <Animated.View style={[likeStyle]} >
                            <LikeIcon size={15} color="#fe3e3e" />
                        </Animated.View>
                        {message.likes.map((usr)=>{
                            const iconSvg = jdenticon.toSvg(usr.slice(16),200)
                            const size = 15
                            return(
                                <View key={usr} >
                                    <SvgXml xml={iconSvg} width={size} height={size} />
                                </View>
                            )
                        })}
                    </TouchableOpacity>
                }
                {message.reply &&
                    <View style={{height:43,position:'absolute',opacity:0.7}} >
                        <View style={{position:'absolute',bottom:0,left:-3}} >
                            <ReplyLineIcon size={35} color="rgba(79, 111, 151, 0.54)" />
                        </View>
                        <LinearGradient
                        colors={user_id === message.reply.user_id ?['rgba(107, 181, 237, 0.9)', 'rgba(43, 183, 238, 0.7)']:['rgba(34, 149, 57, 0.9)', 'rgba(0, 186, 65, 0.88)']}
                        style={{padding: 6,paddingHorizontal:10,borderRadius: 10,position:'absolute',left:25,top:5,display:'flex',maxWidth:screen.width*0.6}}
                        >
                            <Text numberOfLines={1} style={{color: 'white',fontSize: 12,fontWeight:'600',fontFamily:'Agdasima'}}>{message.reply.content}</Text>
                        </LinearGradient>
                    </View>
                }
                <LinearGradient
                colors={['rgba(34, 149, 57, 0.9)', 'rgba(0, 186, 65, 0.88)']}
                style={{padding: 10,paddingHorizontal:15,borderRadius: 16,borderBottomLeftRadius:sameUserBelow?5:16,borderTopLeftRadius:sameUserOnTop?5:16}}
                >
                <Text style={{color: 'white',fontSize: 18,fontWeight:'600',fontFamily:'Agdasima'}}>
                    {message.content}
                </Text>
                </LinearGradient>
            </Pressable>
        </GestureDetector>
    </Animated.View>
  );
}
