import { Message } from "@/app/(tabs)/(chat)";
import { BranchIcon } from "@/assets/svgs/Branch";
import { LikeIcon } from "@/assets/svgs/Like";
import { LikeOutlineIcon } from "@/assets/svgs/LikeOutline";
import { ReplyIcon } from "@/assets/svgs/Reply";
import { ReplyLineIcon } from "@/assets/svgs/ReplyLine";
import { formatRelativeDate } from "@/imports/usefull";
import { LinearGradient } from "expo-linear-gradient";
import jdenticon from "jdenticon/standalone";
import { CheckCircle2, Trash } from "lucide-react-native";
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

export interface PollOption {
    id: string;
    text: string;
    votes: string[]; // array of user_ids who voted for this option
}

export interface Poll {
    question: string;
    options: PollOption[];
    multipleChoice?: boolean;
    expiresAt?: Date;
}



interface PollBubbleType {
    message: Message;
    sameUserBelow: boolean;
    sameUserOnTop: boolean;
    bySender: boolean;
    user_id: string;
    isSelected: boolean;
    onReply: (message: Message) => void;
    onLike: (message: Message) => void;
    onUnLike: (message: Message) => void;
    onLongPress: (message: Message) => void;
    onBranch: (message: Message) => void;
    onVote: (message: Message, optionId: string) => void;
}

export default function MessagePollBubble({ 
    message, 
    sameUserBelow, 
    sameUserOnTop, 
    bySender, 
    user_id, 
    isSelected, 
    onReply, 
    onLike, 
    onUnLike, 
    onLongPress, 
    onBranch,
    onVote 
}: PollBubbleType) {
    if(!message.poll) return

    const [menuPosition, setMenuPosition] = useState<'top' | 'bottom' | 'mid'>('top')
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

    useEffect(() => {
        if (!isSelected) {
            translateX.value = withTiming(0, { duration: 200 })
        }
    }, [isSelected])

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));
    const likeStyle = useAnimatedStyle(() => ({
        transform: [{ scale: likeScale.value }],
    }));
    const selectBubbleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: selectBubbleScale.value }],
    }));

    const handlePress = (msg: Message) => {
        const now = Date.now();

        if (now - lastPress.current < DOUBLE_PRESS_DELAY) {
            if (normalPress.current) {
                clearTimeout(normalPress.current)
            }
            sendOnlike(msg)
        } else {
            normalPress.current = setTimeout(() => {
                if (msg.branch) {
                    onBranch(msg)
                }
            }, DOUBLE_PRESS_DELAY + 10)
        }

        lastPress.current = now;
    };

    const sendOnlike = (msg: Message) => {
        onLike(msg)
        likeScale.value = withSequence(
            withTiming(1.4, { duration: 300 }),
            withSpring(1, { damping: 12 })
        );
    }

    const handleLongPress = (msg: Message) => {
        onLongPress(msg)
        measureDistance()
    }

    const handleLikeMore = (liked: boolean) => {
        if (!liked) {
            sendOnlike(message)
            return
        }
        onUnLike(message)
    }

    const measureDistance = () => {
        bubbleRef.current?.measureInWindow((x, y, width, height) => {
            if (height > 270) {
                translateX.value = withTiming((bySender ? 1 : -1) * screen.width * 0.5, { duration: 200 })
                setMenuPosition('mid')
                selectBubbleScale.value = 0
                setTimeout(() => {
                    selectBubbleScale.value = withSpring(1, { damping: 50 })
                }, 200)
            } else {
                if (y > 340) {
                    setMenuPosition('top')
                    selectBubbleScale.value = 0
                    setTimeout(() => {
                        selectBubbleScale.value = withSpring(1, { damping: 50 })
                    }, 200)
                } else {
                    setMenuPosition('bottom')
                    selectBubbleScale.value = 0
                    setTimeout(() => {
                        selectBubbleScale.value = withSpring(1, { damping: 50 })
                    }, 200)
                }
            }
        });
    };

    // Calculate total votes
    const totalVotes = message.poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);

    // Check if user has voted
    const userVotes = message.poll.options.filter(opt => opt.votes.includes(user_id));
    const hasVoted = userVotes.length > 0;

    // Check if poll is expired
    const isExpired = message.poll.expiresAt ? new Date() > new Date(message.poll.expiresAt) : false;

    const handleVote = (optionId: string) => {
        if (isExpired) return;
        onVote(message, optionId);
    }

    const liked = message.likes ? message.likes.includes(user_id) : false;

    if (bySender) {
        return (
            <Animated.View key={message._id} style={[{ marginVertical: 2, justifyContent: 'flex-end', flexDirection: 'row', alignItems: 'flex-end', gap: 5, display: 'flex', zIndex: isSelected ? 3 : 1, position: 'relative' }, animatedStyle]}>
                {isSelected && <Animated.View style={[{ position: 'absolute', top: menuPosition === 'top' ? -245 : 'auto', bottom: menuPosition === 'bottom' ? -245 : 'auto', right: menuPosition === 'mid' ? 'auto' : 0, left: menuPosition === 'mid' ? -100 : 'auto', height: 235, width: 180, borderRadius: 16, borderWidth: 1, borderColor: '#49494944', backgroundColor: '#0000002b' }, selectBubbleStyle]} >
                    <Text style={{ position: 'absolute', top: 7, fontSize: 15, left: 10, color: '#bbbbbb', fontFamily: 'Agdasima' }} >{formatRelativeDate(message.created_at)}</Text>
                    <View style={{ display: 'flex', alignItems: 'flex-start', paddingHorizontal: 15, justifyContent: 'center', width: '100%', flexDirection: 'column', position: 'absolute', bottom: 10, gap: 10 }} >
                        <TouchableOpacity onPress={() => handleLikeMore(liked)} style={{ display: 'flex', alignItems: 'center', flexDirection: 'row', gap: 10 }} >
                            <LikeOutlineIcon size={34} color="white" />
                            <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: 600 }} >{liked ? 'Unlike' : 'Like'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => onReply(message)} style={{ display: 'flex', alignItems: 'center', flexDirection: 'row', gap: 10 }} >
                            <ReplyIcon size={34} color="white" />
                            <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: 600 }} >Reply</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => onBranch(message)} style={{ display: 'flex', alignItems: 'center', flexDirection: 'row', gap: 10 }} >
                            <BranchIcon size={34} color="white" />
                            <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: 600 }} >{message.branch ? 'Branched' : 'Branch'}</Text>
                        </TouchableOpacity>

                        <View style={{ height: 2, width: '80%', marginLeft: '10%', backgroundColor: '#9999996e', marginVertical: 4, borderRadius: 2 }} ></View>

                        <TouchableOpacity style={{ display: 'flex', alignItems: 'center', flexDirection: 'row', gap: 15 }} >
                            <Trash size={28} color="#ff5858" />
                            <Text style={{ color: '#ff5858', fontSize: 15, fontWeight: 600 }} >Delete</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>}

                <GestureDetector gesture={panGestureSender}>
                    <Pressable ref={bubbleRef} onLongPress={() => handleLongPress(message)} onPress={() => handlePress(message)} style={{ maxWidth: '75%', gap: 0, alignItems: 'flex-end', position: 'relative', paddingTop: message.reply ? 43 : 0, paddingBottom: (message.likes && message.likes.length > 0) ? 10 : 0 }}>
                        {(message.likes && message.likes.length > 0) &&
                            <TouchableOpacity onPress={() => onUnLike(message)} style={{ position: 'absolute', bottom: -5, right: 10, backgroundColor: '#101622', padding: 5, zIndex: 99, borderRadius: 10, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }} >
                                {message.likes.map((usr) => {
                                    const iconSvg = jdenticon.toSvg(usr.slice(16), 200)
                                    const size = 15
                                    return (
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
                            <View style={{ height: 43, position: 'absolute', opacity: 0.7 }} >
                                <View style={{ transform: "scaleX(-1)", position: 'absolute', bottom: 0, right: -3 }} >
                                    <ReplyLineIcon size={35} color="rgba(79, 111, 151, 0.54)" />
                                </View>
                                <LinearGradient
                                    colors={user_id === message.reply.user_id ? ['rgba(107, 181, 237, 0.9)', 'rgba(43, 183, 238, 0.7)'] : ['rgba(34, 149, 57, 0.9)', 'rgba(0, 186, 65, 0.88)']}
                                    style={{ padding: 6, paddingHorizontal: 10, borderRadius: 10, position: 'absolute', right: 25, top: 5, display: 'flex', maxWidth: screen.width * 0.6 }}
                                >
                                    <Text numberOfLines={1} style={{ color: 'white', fontSize: 12, fontWeight: '600', fontFamily: 'Agdasima' }}>{message.reply.content}</Text>
                                </LinearGradient>
                            </View>
                        }

                        <LinearGradient
                            colors={['rgba(107, 181, 237, 0.9)', 'rgba(43, 183, 238, 0.7)']}
                            style={{ padding: 12, paddingHorizontal: 15, borderRadius: 16, borderBottomRightRadius: sameUserBelow ? 5 : 16, borderTopRightRadius: sameUserOnTop ? 5 : 16, borderWidth: message.branch ? 2 : 0, borderColor: '#fff', borderStyle: 'dashed', minWidth: 220 }}
                        >
                            <Text style={{ color: 'white', fontSize: 16, fontWeight: '700', fontFamily: 'Agdasima', marginBottom: 8 }}>
                                {message.poll.question}
                            </Text>

                            {message.poll.options.map((option, index) => {
                                const percentage = totalVotes > 0 ? (option.votes.length / totalVotes) * 100 : 0;
                                const userVoted = option.votes.includes(user_id);
                                if(!message.poll) return

                                return (
                                    <TouchableOpacity
                                        key={option.id}
                                        onPress={() => handleVote(option.id)}
                                        disabled={isExpired}
                                        style={{ marginBottom: index < message.poll.options.length - 1 ? 8 : 0 }}
                                    >
                                        <View style={{ 
                                            backgroundColor: 'rgba(255, 255, 255, 0.15)', 
                                            borderRadius: 8, 
                                            overflow: 'hidden',
                                            borderWidth: userVoted ? 2 : 1,
                                            borderColor: userVoted ? '#fff' : 'rgba(255, 255, 255, 0.3)'
                                        }}>
                                            {hasVoted && (
                                                <View style={{ 
                                                    position: 'absolute', 
                                                    left: 0, 
                                                    top: 0, 
                                                    bottom: 0, 
                                                    width: `${percentage}%`, 
                                                    backgroundColor: 'rgba(255, 255, 255, 0.25)' 
                                                }} />
                                            )}
                                            <View style={{ 
                                                padding: 10, 
                                                paddingHorizontal: 12, 
                                                flexDirection: 'row', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'center' 
                                            }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                                    {userVoted && <CheckCircle2 size={16} color="#fff" />}
                                                    <Text style={{ 
                                                        color: 'white', 
                                                        fontSize: 15, 
                                                        fontWeight: userVoted ? '700' : '600', 
                                                        fontFamily: 'Agdasima',
                                                        flex: 1
                                                    }}>
                                                        {option.text}
                                                    </Text>
                                                </View>
                                                {hasVoted && (
                                                    <Text style={{ 
                                                        color: 'rgba(255, 255, 255, 0.9)', 
                                                        fontSize: 14, 
                                                        fontWeight: '600',
                                                        fontFamily: 'Agdasima'
                                                    }}>
                                                        {percentage.toFixed(0)}%
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}

                            <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 12, fontFamily: 'Agdasima' }}>
                                    {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                                </Text>
                                {isExpired && (
                                    <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 12, fontFamily: 'Agdasima' }}>
                                        Ended
                                    </Text>
                                )}
                            </View>
                        </LinearGradient>
                    </Pressable>
                </GestureDetector>
            </Animated.View>
        )
    }

    return (
        <Animated.View key={message._id} style={[{ marginVertical: 2, position: 'relative', marginBottom: !sameUserBelow ? 20 : 2, flexDirection: 'row', alignItems: 'flex-end', gap: 5, zIndex: isSelected ? 3 : 1 }, animatedStyle]}>
            {!sameUserBelow && <Text style={{ position: 'absolute', bottom: -15, left: 0, color: '#999', fontSize: 12, fontFamily: 'courier', }} >{message.username}</Text>}

            {isSelected && <Animated.View style={[{ position: 'absolute', top: menuPosition === 'top' ? -245 : 'auto', bottom: menuPosition === 'bottom' ? -245 : 'auto', left: menuPosition === 'mid' ? 'auto' : 0, right: menuPosition === 'mid' ? -100 : 'auto', height: 235, width: 180, borderRadius: 16, borderWidth: 1, borderColor: '#49494944', backgroundColor: '#0000002b' }, selectBubbleStyle]} >
                <Text style={{ position: 'absolute', top: 7, fontSize: 15, left: 10, color: '#bbbbbb', fontFamily: 'Agdasima' }} >{formatRelativeDate(message.created_at)}</Text>
                <View style={{ display: 'flex', alignItems: 'flex-start', paddingHorizontal: 15, justifyContent: 'center', width: '100%', flexDirection: 'column', position: 'absolute', bottom: 10, gap: 10 }} >
                    <TouchableOpacity onPress={() => handleLikeMore(liked)} style={{ display: 'flex', alignItems: 'center', flexDirection: 'row', gap: 10 }} >
                        <LikeOutlineIcon size={34} color="white" />
                        <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: 600 }} >{liked ? 'Unlike' : 'Like'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onReply(message)} style={{ display: 'flex', alignItems: 'center', flexDirection: 'row', gap: 10 }} >
                        <ReplyIcon size={34} color="white" />
                        <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: 600 }} >Reply</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onBranch(message)} style={{ display: 'flex', alignItems: 'center', flexDirection: 'row', gap: 10 }} >
                        <BranchIcon size={34} color="white" />
                        <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: 600 }} >{message.branch ? 'Branched' : 'Branch'}</Text>
                    </TouchableOpacity>

                    <View style={{ height: 2, width: '80%', marginLeft: '10%', backgroundColor: '#9999996e', marginVertical: 4, borderRadius: 2 }} ></View>

                    <TouchableOpacity style={{ display: 'flex', alignItems: 'center', flexDirection: 'row', gap: 15 }} >
                        <Trash size={28} color="#ff5858" />
                        <Text style={{ color: '#ff5858', fontSize: 15, fontWeight: 600 }} >Delete</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>}

            <GestureDetector gesture={panGestureUser}>
                <Pressable ref={bubbleRef} onLongPress={() => handleLongPress(message)} onPress={() => handlePress(message)} style={{ maxWidth: '75%', paddingTop: message.reply ? 43 : 0, paddingBottom: (message.likes && message.likes.length > 0) ? 10 : 0 }}>
                    {(message.likes && message.likes.length > 0) &&
                        <TouchableOpacity onPress={() => onUnLike(message)} style={{ position: 'absolute', bottom: -5, left: 10, backgroundColor: '#101622', padding: 5, zIndex: 99, borderRadius: 10, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }} >
                            <Animated.View style={[likeStyle]} >
                                <LikeIcon size={15} color="#fe3e3e" />
                            </Animated.View>
                            {message.likes.map((usr) => {
                                const iconSvg = jdenticon.toSvg(usr.slice(16), 200)
                                const size = 15
                                return (
                                    <View key={usr} >
                                        <SvgXml xml={iconSvg} width={size} height={size} />
                                    </View>
                                )
                            })}
                        </TouchableOpacity>
                    }
                    {message.reply &&
                        <View style={{ height: 43, position: 'absolute', opacity: 0.7 }} >
                            <View style={{ position: 'absolute', bottom: 0, left: -3 }} >
                                <ReplyLineIcon size={35} color="rgba(79, 111, 151, 0.54)" />
                            </View>
                            <LinearGradient
                                colors={user_id === message.reply.user_id ? ['rgba(107, 181, 237, 0.9)', 'rgba(43, 183, 238, 0.7)'] : ['rgba(34, 149, 57, 0.9)', 'rgba(0, 186, 65, 0.88)']}
                                style={{ padding: 6, paddingHorizontal: 10, borderRadius: 10, position: 'absolute', left: 25, top: 5, display: 'flex', maxWidth: screen.width * 0.6 }}
                            >
                                <Text numberOfLines={1} style={{ color: 'white', fontSize: 12, fontWeight: '600', fontFamily: 'Agdasima' }}>{message.reply.content}</Text>
                            </LinearGradient>
                        </View>
                    }
                    <LinearGradient
                        colors={['rgba(34, 149, 57, 0.9)', 'rgba(0, 186, 65, 0.88)']}
                        style={{ padding: 12, paddingHorizontal: 15, borderRadius: 16, borderBottomLeftRadius: sameUserBelow ? 5 : 16, borderTopLeftRadius: sameUserOnTop ? 5 : 16, borderWidth: message.branch ? 2 : 0, borderColor: '#fff', borderStyle: 'dashed', minWidth: 220 }}
                    >
                        <Text style={{ color: 'white', fontSize: 16, fontWeight: '700', fontFamily: 'Agdasima', marginBottom: 8 }}>
                            {message.poll.question}
                        </Text>

                        {message.poll.options.map((option, index) => {
                            const percentage = totalVotes > 0 ? (option.votes.length / totalVotes) * 100 : 0;
                            const userVoted = option.votes.includes(user_id);
                            if(!message.poll) return
                            return (
                                <TouchableOpacity
                                    key={option.id}
                                    onPress={() => handleVote(option.id)}
                                    disabled={isExpired}
                                    style={{ marginBottom: index < message.poll.options.length - 1 ? 8 : 0 }}
                                >
                                    <View style={{ 
                                        backgroundColor: 'rgba(255, 255, 255, 0.15)', 
                                        borderRadius: 8, 
                                        overflow: 'hidden',
                                        borderWidth: userVoted ? 2 : 1,
                                        borderColor: userVoted ? '#fff' : 'rgba(255, 255, 255, 0.3)'
                                    }}>
                                        {hasVoted && (
                                            <View style={{ 
                                                position: 'absolute', 
                                                left: 0, 
                                                top: 0, 
                                                bottom: 0, 
                                                width: `${percentage}%`, 
                                                backgroundColor: 'rgba(255, 255, 255, 0.25)' 
                                            }} />
                                        )}
                                        <View style={{ 
                                            padding: 10, 
                                            paddingHorizontal: 12, 
                                            flexDirection: 'row', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center' 
                                        }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                                {userVoted && <CheckCircle2 size={16} color="#fff" />}
                                                <Text style={{ 
                                                    color: 'white', 
                                                    fontSize: 15, 
                                                    fontWeight: userVoted ? '700' : '600', 
                                                    fontFamily: 'Agdasima',
                                                    flex: 1
                                                }}>
                                                    {option.text}
                                                </Text>
                                            </View>
                                            {hasVoted && (
                                                <Text style={{ 
                                                    color: 'rgba(255, 255, 255, 0.9)', 
                                                    fontSize: 14, 
                                                    fontWeight: '600',
                                                    fontFamily: 'Agdasima'
                                                }}>
                                                    {percentage.toFixed(0)}%
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}

                        <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 12, fontFamily: 'Agdasima' }}>
                                {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                            </Text>
                            {isExpired && (
                                <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 12, fontFamily: 'Agdasima' }}>
                                    Ended
                                </Text>
                            )}
                        </View>
                    </LinearGradient>
                </Pressable>
            </GestureDetector>
        </Animated.View>
    );
}