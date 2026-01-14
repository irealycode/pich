import Svg, { G, Path } from "react-native-svg";

export function LikeIcon({size,color}:{size:number,color:string}){
    return(
        
        <Svg  viewBox="0 0 24 24" width={size} height={size}>
           
           <G id="SVGRepo_bgCarrier" strokeWidth="0">
            </G>
           <G id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round">
            </G>
           <G id="SVGRepo_iconCarrier"> 
            <Path d="M2 9.1371C2 14 6.01943 16.5914 8.96173 18.9109C10 19.7294 11 20.5 12 20.5C13 20.5 14 19.7294 15.0383 18.9109C17.9806 16.5914 22 14 22 9.1371C22 4.27416 16.4998 0.825464 12 5.50063C7.50016 0.825464 2 4.27416 2 9.1371Z" fill={color}>
            </Path> 
           </G>
        </Svg>
    )
}