import { Message } from "@/app/(tabs)/(chat)";
import { BranchIcon } from "@/assets/svgs/Branch";
import { LikeIcon } from "@/assets/svgs/Like";
import { LikeOutlineIcon } from "@/assets/svgs/LikeOutline";
import { ReplyIcon } from "@/assets/svgs/Reply";
import { ReplyLineIcon } from "@/assets/svgs/ReplyLine";
import { formatRelativeDate } from "@/imports/usefull";
import { LinearGradient } from "expo-linear-gradient";
import jdenticon from "jdenticon/standalone";
import { Trash } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
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
    sameUserBelow : boolean,
    sameUserOnTop : boolean,
    bySender : boolean,
    user_id : string,
    isSelected : boolean,
    onReply : (message : Message) => void,
    onLike : (message : Message) => void,
    onUnLike : (message : Message) => void,
    onLongPress : (message : Message) => void,
    onBranch : (message : Message) => void,
}

export default function MessageBubble({ message, sameUserBelow, sameUserOnTop, bySender, user_id, isSelected, onReply, onLike, onUnLike, onLongPress, onBranch } : MessageBubbleType) {

    const [menuPosition,setMenuPosition] = useState<'top' | 'bottom' | 'mid'>('top')
    const bubbleRef = useRef<View>(null);
    const translateX = useSharedValue(0);
    const likeScale = useSharedValue(1);
    const selectBubbleScale = useSharedValue(0);
    const lastPress = useRef(0);
    const normalPress = useRef<ReturnType<typeof setTimeout> | null>(null);
    const THRESHOLD = 60;
    const DOUBLE_PRESS_DELAY = 300;
    const panGestureSender = Gesture.Pan()
    .enabled(!isSelected)
    .activeOffsetX([-60, 0])
    .failOffsetY([-10, 10])
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
    .enabled(!isSelected)
    .activeOffsetX([-60, 60])
    .failOffsetY([-10, 10])
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


    useEffect(()=>{
        if (!isSelected) {
            translateX.value = withTiming(0, {duration: 200})
        }
    },[isSelected])

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));
    const likeStyle = useAnimatedStyle(() => ({
        transform: [{ scale: likeScale.value }],
    }));
    const selectBubbleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: selectBubbleScale.value }],
    }));

    const handlePress = (msg : Message) => {
        const now = Date.now();

        if (now - lastPress.current < DOUBLE_PRESS_DELAY) {
            if (normalPress.current) {
                clearTimeout(normalPress.current)
            }
            sendOnlike(msg)
        }else{
            normalPress.current = setTimeout(()=>{
                if (msg.branch) {
                    onBranch(msg)
                }
            },DOUBLE_PRESS_DELAY+10)
        }

        lastPress.current = now;
    };

    const sendOnlike = (msg : Message) => {
        onLike(msg)
        likeScale.value = withSequence(
            withTiming(1.4, { duration:300 }),
            withSpring(1, { damping: 12 })
        );
    }

    const handleLongPress = (msg : Message) =>{
        onLongPress(msg)
        measureDistance()
    }

    const handleLikeMore = (liked : boolean) => {
        if (!liked) {
            sendOnlike(message)
            return
        }
        onUnLike(message)
    }

    const measureDistance = () => {
        bubbleRef.current?.measureInWindow((x, y, width, height) => {
            // console.log('would fit: ', (y - height)  > 300 ,' | y/2: ',y - height/2,' | y : ',y)
            console.log('would fit: ', (y)  > 340 ,' | height  : ',height)
            if (height > 270) {
                translateX.value = withTiming((bySender?1:-1) * screen.width*0.5, {duration: 200})
                setMenuPosition('mid')
                selectBubbleScale.value = 0
                setTimeout(()=>{
                    selectBubbleScale.value = withSpring(1, { damping:50 })
                },200)
            }else{
                if(y > 340){
                    setMenuPosition('top')
                    selectBubbleScale.value = 0
                    setTimeout(()=>{
                        selectBubbleScale.value = withSpring(1, { damping:50 })
                    },200)
                }else{
                    setMenuPosition('bottom')
                    selectBubbleScale.value = 0
                    setTimeout(()=>{
                        selectBubbleScale.value = withSpring(1, { damping:50 })
                    },200)
                }
            }
            
        });
    };

    const mock_user = ["39023875756029346023467","390238757560201942385710978346","3902387575602356134514613723564","39023875756023456843568243652345"]
    const liked = message.likes?message.likes.includes(user_id):false
//   message.likes = [mock_user]
  if(bySender) {
    return(
    <Animated.View key={message._id} style={[{marginVertical:2,justifyContent: 'flex-end',flexDirection: 'row',alignItems: 'flex-end',gap: 5,display:'flex',zIndex:isSelected?3:1,position:'relative'},animatedStyle]}>
        {isSelected && <Animated.View style={[{position:'absolute',top:menuPosition === 'top'?-245:'auto',bottom:menuPosition === 'bottom'?-245:'auto',right:menuPosition === 'mid'?'auto':0,left:menuPosition === 'mid'?-100:'auto',height:235,width:180,borderRadius:16,borderWidth:1,borderColor:'#49494944',backgroundColor:'#0000002b'},selectBubbleStyle]} >
            <Text style={{position:'absolute',top:7,fontSize:15,left:10,color:'#bbbbbb',fontFamily:'Agdasima'}} >{formatRelativeDate(message.created_at)}</Text>
            <View style={{display:'flex',alignItems:'flex-start',paddingHorizontal:15,justifyContent:'center',width:'100%',flexDirection:'column',position:'absolute',bottom:10,gap:10}} >
                <TouchableOpacity onPress={()=>handleLikeMore(liked)} style={{display:'flex',alignItems:'center',flexDirection:'row',gap:10}} >
                    <LikeOutlineIcon size={34} color="white" />
                    <Text style={{color:'#ffffff',fontSize:15,fontWeight:600}} >{liked?'Unlike':'Like'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={()=>onReply(message)} style={{display:'flex',alignItems:'center',flexDirection:'row',gap:10}} >
                    <ReplyIcon size={34} color="white" />
                    <Text style={{color:'#ffffff',fontSize:15,fontWeight:600}} >Reply</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={()=>onBranch(message)} style={{display:'flex',alignItems:'center',flexDirection:'row',gap:10}} >
                    <BranchIcon size={34} color="white" />
                    <Text style={{color:'#ffffff',fontSize:15,fontWeight:600}} >{message.branch?'Branched':'Branch'}</Text>
                </TouchableOpacity>

                <View style={{height:2,width:'80%',marginLeft:'10%',backgroundColor:'#9999996e',marginVertical:4,borderRadius:2}} ></View>
                
                <TouchableOpacity style={{display:'flex',alignItems:'center',flexDirection:'row',gap:15}} >
                    <Trash size={28} color="#ff5858" />
                    <Text style={{color:'#ff5858',fontSize:15,fontWeight:600}} >Delete</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>}

        <GestureDetector gesture={panGestureSender}>
            <Pressable ref={bubbleRef} onLongPress={()=>handleLongPress(message)} onPress={()=>handlePress(message)} style={{maxWidth: '75%',gap: 0,alignItems: 'flex-end',position:'relative',paddingTop:message.reply?43:0,paddingBottom:(message.likes && message.likes.length > 0)?10:0}}>
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
                style={{padding: 10,paddingHorizontal:15,borderRadius: 16,borderBottomRightRadius:sameUserBelow?5:16,borderTopRightRadius:sameUserOnTop?5:16,borderWidth:message.branch?2:0,borderColor:'#fff',borderStyle:'dashed'}}
                >
                <Text style={{color: 'white',fontSize: 18,fontWeight:'600',fontFamily:'Agdasima'}}>{message.content}</Text>
                </LinearGradient>
            </Pressable>
        </GestureDetector>
    </Animated.View>
    )
  }

  return (
    <Animated.View key={message._id} style={[{marginVertical:2,position:'relative',marginBottom:!sameUserBelow?20:2,flexDirection: 'row',alignItems: 'flex-end',gap: 5,zIndex:isSelected?3:1},animatedStyle]}>
        {!sameUserBelow && <Text style={{position:'absolute',bottom:-15,left:0,color:'#999',fontSize:12,fontFamily:'courier',}} >{message.username}</Text>}
        
        {isSelected && <Animated.View style={[{position:'absolute',top:menuPosition === 'top'?-245:'auto',bottom:menuPosition === 'bottom'?-245:'auto',left:menuPosition === 'mid'?'auto':0,right:menuPosition === 'mid'?-100:'auto',height:235,width:180,borderRadius:16,borderWidth:1,borderColor:'#49494944',backgroundColor:'#0000002b'},selectBubbleStyle]} >
            <Text style={{position:'absolute',top:7,fontSize:15,left:10,color:'#bbbbbb',fontFamily:'Agdasima'}} >{formatRelativeDate(message.created_at)}</Text>
            <View style={{display:'flex',alignItems:'flex-start',paddingHorizontal:15,justifyContent:'center',width:'100%',flexDirection:'column',position:'absolute',bottom:10,gap:10}} >
                <TouchableOpacity onPress={()=>handleLikeMore(liked)} style={{display:'flex',alignItems:'center',flexDirection:'row',gap:10}} >
                    <LikeOutlineIcon size={34} color="white" />
                    <Text style={{color:'#ffffff',fontSize:15,fontWeight:600}} >{liked?'Unlike':'Like'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={()=>onReply(message)} style={{display:'flex',alignItems:'center',flexDirection:'row',gap:10}} >
                    <ReplyIcon size={34} color="white" />
                    <Text style={{color:'#ffffff',fontSize:15,fontWeight:600}} >Reply</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={()=>onBranch(message)} style={{display:'flex',alignItems:'center',flexDirection:'row',gap:10}} >
                    <BranchIcon size={34} color="white" />
                    <Text style={{color:'#ffffff',fontSize:15,fontWeight:600}} >{message.branch?'Branched':'Branch'}</Text>
                </TouchableOpacity>

                <View style={{height:2,width:'80%',marginLeft:'10%',backgroundColor:'#9999996e',marginVertical:4,borderRadius:2}} ></View>
                
                <TouchableOpacity style={{display:'flex',alignItems:'center',flexDirection:'row',gap:15}} >
                    <Trash size={28} color="#ff5858" />
                    <Text style={{color:'#ff5858',fontSize:15,fontWeight:600}} >Delete</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>}

        <GestureDetector gesture={panGestureUser}>
            <Pressable ref={bubbleRef} onLongPress={()=>handleLongPress(message)} onPress={()=>handlePress(message)} style={{maxWidth:'75%',paddingTop:message.reply?43:0,paddingBottom:(message.likes && message.likes.length > 0)?10:0}}>
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
                style={{padding: 10,paddingHorizontal:15,borderRadius: 16,borderBottomLeftRadius:sameUserBelow?5:16,borderTopLeftRadius:sameUserOnTop?5:16,borderWidth:message.branch?2:0,borderColor:'#fff',borderStyle:'dashed'}}
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
