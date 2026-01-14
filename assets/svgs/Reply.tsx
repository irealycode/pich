import Svg, { G, Path } from "react-native-svg";

export function ReplyIcon({size,color}:{size:number,color:string}){
    return(
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <G id="SVGRepo_bgCarrier" stroke-width="0">
            </G>
        <G id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round">
            </G>
        <G id="SVGRepo_iconCarrier"> 
            <Path d="M4.5 12L9.5 7M4.5 12L9.5 17M4.5 12L14.5 12C16.1667 12 19.5 13 19.5 17" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            </Path> 
        </G>
    </Svg>
    )
}