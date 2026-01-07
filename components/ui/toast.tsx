import { useEffect } from "react";
import { Dimensions, Text } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";


const screen = Dimensions.get('screen')

export interface ToastyIN {
    message:string,
    type?:'success'|'error'|'warning'|'info'
}

export default function Toasty({message,type = 'info'}:ToastyIN) {
    const opacity = useSharedValue(0)
    const animatedStyle = useAnimatedStyle(() => ({
        opacity : opacity.value
    }))

    useEffect(()=>{
        fadeDown()
    },[])

    const fadeDown = () =>{
        opacity.value = withTiming(1, { duration: 300 })
        setTimeout(()=>{
            opacity.value = withTiming(0, { duration: 300 })
        },5000)
    }

    const bgColorMap = {
        success: 'rgba(207, 249, 212, 1)',
        error: 'rgba(206, 110, 97, 1)',
        warning: 'rgba(224, 163, 66, 1)',
        info: 'rgba(255, 255, 255, 0.12)'
    };
    const borderColorMap = {
        success: '#5aa35eff',
        error: 'rgba(234, 58, 35, 0.12)',
        warning: 'rgba(183, 136, 60, 0.66)',
        info: '#ffffff31'
    };

    const bgcolor = bgColorMap[type]
    const borderColor = borderColorMap[type]
    return(
        <Animated.View style={[animatedStyle,{position:'absolute',bottom:20,width:screen.width - 40,right:20,height:50,backgroundColor:bgcolor,zIndex:990,borderWidth:1,borderColor:borderColor,borderRadius:30,borderTopLeftRadius:10,borderTopRightRadius:10,display:'flex',alignItems:'center',justifyContent:'center'}]} >
            <Text style={{fontFamily:'Agdasima',fontSize:23,color:type === 'success'?'black':'white'}} >{message}</Text>
        </Animated.View>
    )
}