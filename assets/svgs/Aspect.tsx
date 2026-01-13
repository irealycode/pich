import Svg, { G, Path } from "react-native-svg";

export function AscpectIcon({size,color}:{size:number,color:string}) {
    return (
        <Svg height={size} width={size}  viewBox="0 0 24 24" fill="none" >
            <G id="SVGRepo_bgCarrier" stroke-width="0">
                </G>
            <G id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round">
                </G>
            <G id="SVGRepo_iconCarrier"> 
            <Path d="M18.5 15V18.5H15" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.4}>
                </Path> 
            <Path d="M9.00003 18.5H5.50003V15" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.4}>
                </Path> 
            <Path d="M15 5.49997L18.4958 5.49997V8.99997" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.4}>
                </Path> 
            <Path d="M9.00003 5.49997H5.50003V8.99997" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.4}>
                </Path> 
            </G>
        </Svg>
    )
}