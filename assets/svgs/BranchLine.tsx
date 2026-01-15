import Svg, { G, Polyline, Rect } from "react-native-svg";

export function BranchLineIcon({size,color}:{size:number,color:string}){
    return(
    <Svg width={size} height={size} viewBox="367.8799 149.2905 31.21 28.488" fill="none">
        <Rect width="31.21" height="28.488" fill-opacity="0.01" fill={"#ffffff00"} x="7.585" y="9.918" transform="matrix(1, 0, 0, 1, 360.2949020950464, 139.37251697100737)"/>
        <G   transform="matrix(1, 0, 0, 1, 365.2949020950464, 143.37251697100737)" stroke={color} strokeWidth="4">
            <Polyline id="Path-315" strokeLinecap="round" points="4.858 8.086 4.858 32.086 4.858 20.094 31.858 20.094"/>
        </G>
    </Svg>
    )
}
