import { StyleProp, ViewStyle } from "react-native";
import Svg, { G, Path } from "react-native-svg";

export function ReplyLineIcon({size,color,style}:{size:number,color:string,style?: StyleProp<ViewStyle>}){
    return(
    
    <Svg style={style} width={size} height={size} viewBox="0 0 24 24" transform="rotate(135)" >
    
    <G id="SVGRepo_bgCarrier" strokeWidth="0">
        </G>
    <G id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round">
        </G>
    <G id="SVGRepo_iconCarrier"> 
        <G id="style=stroke"> 
        <G id="check"> 
        <Path id="vector (Stroke)" fillRule="evenodd" clipRule="evenodd" d="M19.5303 7.21967C19.8232 7.51256 19.8232 7.98744 19.5303 8.28033L11.6112 16.1994C10.5373 17.2734 8.79607 17.2734 7.72212 16.1995L4.46967 12.947C4.17678 12.6541 4.17678 12.1792 4.46967 11.8863C4.76256 11.5934 5.23744 11.5934 5.53033 11.8863L8.78278 15.1388C9.27094 15.6269 10.0624 15.6269 10.5505 15.1388L18.4697 7.21967C18.7626 6.92678 19.2374 6.92678 19.5303 7.21967Z" fill={color}>
        </Path> 
    </G> 
    </G> 
    </G>
    </Svg>
    )
}