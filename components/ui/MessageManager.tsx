import { Message } from "@/app/(tabs)/(chat)"
import { decrypt } from "@/imports/crypto"
import { ip, port } from "@/imports/overall"
import axios from "axios"
import { BlurView } from "expo-blur"
import { router } from "expo-router"
import { useState } from "react"
import { Dimensions, Pressable } from "react-native"
import MessageBubble from "./MessageBubble"
import MessagePollBubble, { Poll, PollOption } from "./MessagePollBubble"

interface MessageManagerType {
    name: string,
    description: string,
    messages: Message[],
    chat_id: string,
    chat_key: string,
    user_id: string,
    token: string,
    showBlur: boolean,
    contentHeight: number,
    onReplyMessage : (message : Message) => void,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    onCloseBlur: () => void,
}

const screen = Dimensions.get("screen")


export default function MessageManager({name,description,messages,chat_id,chat_key,user_id,token,showBlur,contentHeight,onReplyMessage,onCloseBlur,setMessages}:MessageManagerType){
    const [messageBubbleSelected, setMessageBubbleSelected] = useState<Message | null>(null);
    const key = chat_key
    
    const onReply = (message : Message) =>{
        setMessageBubbleSelected(null)
        onReplyMessage(message)
        // setMessageToReply(message)
        // setTimeout(()=>{
        // replyPaddingTop.value = withTiming(75,{ duration : 300 })
        // },300)
    }

    const onLike = async(message : Message) =>{
        setMessageBubbleSelected(null)
        if(!message.likes || !message.likes.includes(user_id)){
        await axios.get(`http://${ip}:${port}/messages/like/${chat_id}/${message._id}`,{
            headers:{
                Authorization : `Bearer ${token}`
            }
        })
        setMessages(prev => prev.map((m)=>m._id === message._id?({...m,likes:m.likes?[...m.likes,user_id]:[user_id]}):m))
        }
        
    }

    const onUnLike = async(message : Message) =>{
        setMessageBubbleSelected(null)
        if(message.likes?.includes(user_id)){
        await axios.get(`http://${ip}:${port}/messages/unlike/${chat_id}/${message._id}`,{
            headers:{
            Authorization : `Bearer ${token}`
            }
        })
        setMessages(prev => prev.map((m)=>m._id === message._id?({...m,likes:m.likes?.filter((l)=>l !== user_id)}):m))
        }
    }

    const onLongPress = async(message : Message) =>{
        console.log('long press')
        setMessageBubbleSelected(message)
    }

    const onBranch = async(message: Message) =>{
        if (!message.branch) {
        const branch = await axios.get(`http://${ip}:${port}/messages/branch/${chat_id}/${message._id}`,{
            headers:{
            Authorization : `Bearer ${token}`
            }
        })
        setMessageBubbleSelected(null)
        router.push({pathname:'/(tabs)/(chat)/branch',params:{chat_id,key,name,description,branch_id:branch.data}})
        return
        }
        setMessageBubbleSelected(null)
        router.push({pathname:'/(tabs)/(chat)/branch',params:{chat_id,key,name,description,branch_id:message.branch}})
        console.log(message)
    }


    const onVote = async (message: Message, optionId: string) => {
        try {
            const response = await axios.post(`http://${ip}:${port}/messages/polls/vote`, {
                message_id: message._id,
                option_id: optionId,
                chat_id: chat_id
            },{
            headers:{
                Authorization : `Bearer ${token}`
            }
            });
            const poll_ret = response.data.poll
            const poll : Poll = {question:decrypt(poll_ret.question,key),options:poll_ret.options.map((op : PollOption)=>({...op,text:decrypt(op.text,key)}))}
            setMessages(prev => prev.map((m)=>m._id===message._id && m.poll?({...m,poll}):m))
            console.log('Vote registered:', response.data);
        } catch (error) {
            console.error('Error voting on poll:', error);
        }
    }



    return(
        <>
            {(messageBubbleSelected || showBlur) && <Pressable onPress={()=>{setMessageBubbleSelected(null);onCloseBlur()}} style={{position:'absolute',top:contentHeight < screen.height - 150? 0:'auto',bottom:contentHeight < screen.height - 150? 'auto':0,left:0,width:screen.width,height:contentHeight < screen.height? screen.height:contentHeight,zIndex:2}} >
                <BlurView intensity={40} tint="dark" style={{width:'100%',height:'100%'}}>
            
                </BlurView> 
            </Pressable>}
            
            {
            messages.map((msg,i)=>{
                const sameUserBelow = msg.user_id === messages[i + 1]?.user_id
                const sameUserOnTop = msg.user_id === messages[i - 1]?.user_id
                const bySender = msg.user_id === user_id
                const isSelected = messageBubbleSelected?messageBubbleSelected._id === msg._id:false
                // const user_colors = stringToColor(msg.user_id)
                if (msg.poll) {
                return(
                    <MessagePollBubble key={msg._id} 
                    // zIndex={isSelected?3:1}
                    isSelected={isSelected}
                    user_id={user_id} 
                    message={msg} 
                    sameUserBelow={sameUserBelow} 
                    sameUserOnTop={sameUserOnTop} 
                    bySender={bySender}
                    onLongPress={onLongPress} 
                    onReply={onReply} 
                    onLike={onLike} 
                    onUnLike={onUnLike} 
                    onBranch={onBranch}
                    onVote={onVote}
                    />
                )
                }
                return(
                    <MessageBubble key={msg._id} 
                        // zIndex={isSelected?3:1}
                        isSelected={isSelected}
                        user_id={user_id} 
                        message={msg} 
                        sameUserBelow={sameUserBelow} 
                        sameUserOnTop={sameUserOnTop} 
                        bySender={bySender}
                        onLongPress={onLongPress} 
                        onReply={onReply} 
                        onLike={onLike} 
                        onUnLike={onUnLike} 
                        onBranch={onBranch}
                    />
                )
            })
        }
        </>
    )

}