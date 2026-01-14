import Svg, { Circle, G, Path } from "react-native-svg";

export function BranchIcon({size,color}:{size:number,color:string}){
    return(
    
    <Svg width={size} height={size} viewBox="0 0 512 512" fill={color}>
    <G>
      <Circle
        cx="160"
        cy="96"
        r="48"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      ></Circle>
      <Circle
        cx="160"
        cy="416"
        r="48"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      ></Circle>
      <Path
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
        d="M160 368V144"
      ></Path>
      <Circle
        cx="352"
        cy="160"
        r="48"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      ></Circle>
      <Path
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
        d="M352 208c0 128-192 48-192 160"
      ></Path>
    </G>
  </Svg>
    )
}
