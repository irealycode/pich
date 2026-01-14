import { Message } from "@/app/(tabs)/(chat)";
import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";

interface MessageBubbleType {
    message : Message, 
    sameUserBelow : boolean,
    sameUserOnTop : boolean,
    bySender : boolean
}

export default function MessageBubbleDead({ message,  sameUserBelow, sameUserOnTop, bySender } : MessageBubbleType) {

  if(bySender) {
    return(
        <View key={message._id} style={{flexDirection: 'row',maxHeight:42}}>
            <View style={{gap: 0,alignItems: 'flex-end'}}>
                {/* <Text style={styles.messageTimeUser}>You • 9:02 AM</Text> */}
                <LinearGradient
                colors={['rgba(107, 181, 237, 0.9)', 'rgba(43, 183, 238, 0.7)']}
                style={{padding: 10,paddingHorizontal:15,borderRadius: 16,borderBottomRightRadius:sameUserBelow?5:16,borderTopRightRadius:sameUserOnTop?5:16}}
                >
                <Text numberOfLines={1} style={{color: 'white',fontSize: 18,fontWeight:'600',fontFamily:'Agdasima'}}>{message.content}</Text>
                </LinearGradient>
            </View>
        </View>
    )
  }

  return (
        <View key={message._id} style={{position:'relative',flexDirection: 'row',maxHeight:42}}>
            <View style={{}}>
                <LinearGradient
                colors={['rgba(34, 149, 57, 0.9)', 'rgba(0, 186, 65, 0.88)']}
                style={{padding: 10,paddingHorizontal:15,borderRadius: 16,borderBottomLeftRadius:sameUserBelow?5:16,borderTopLeftRadius:sameUserOnTop?5:16}}
                >
                <Text numberOfLines={1} style={{color: 'white',fontSize: 18,fontWeight:'600',fontFamily:'Agdasima'}}>
                    {message.content}
                </Text>
                </LinearGradient>
            </View>
        </View>
  );
}
