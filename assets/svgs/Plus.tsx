import Svg, { G, Path } from "react-native-svg";

export function PlusIcon({size,color}:{size:number,color:string}){
    return(
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <G id="SVGRepo_bgCarrier" stroke-width="0">
        </G>
        <G id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round">
            </G>
        <G id="SVGRepo_iconCarrier"> 
            <Path d="M6 12H18M12 6V18" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            </Path> 
        </G>
    </Svg>
    )
}