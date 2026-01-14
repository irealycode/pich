import Svg, { G, Path } from "react-native-svg";

export function CloseIcon({size,color}:{size:number,color:string}){
    return(
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
     <G id="SVGRepo_bgCarrier" strokeWidth="0">
        </G>
     <G id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round">
        </G>
     <G id="SVGRepo_iconCarrier"> 
        <G id="style=stroke"> 
        <G id="close"> 
        <Path id="vector (Stroke)" fillRule="evenodd" clipRule="evenodd" d="M6.21991 6.21479C6.51281 5.92189 6.98768 5.92189 7.28057 6.21479L17.7854 16.7196C18.0783 17.0125 18.0783 17.4874 17.7854 17.7803C17.4925 18.0732 17.0177 18.0732 16.7248 17.7803L6.21991 7.27545C5.92702 6.98255 5.92702 6.50768 6.21991 6.21479Z" fill={color}>
        </Path> 
     <Path id="vector (Stroke)_2" fillRule="evenodd" clipRule="evenodd" d="M17.7853 6.21479C18.0782 6.50769 18.0782 6.98256 17.7853 7.27545L7.28038 17.7802C6.98749 18.0731 6.51261 18.0731 6.21972 17.7802C5.92683 17.4873 5.92683 17.0124 6.21973 16.7195L16.7247 6.21478C17.0176 5.92189 17.4924 5.9219 17.7853 6.21479Z" fill={color}>
        </Path> 
     </G> 
     </G> 
     </G>
    </Svg>
    )
}