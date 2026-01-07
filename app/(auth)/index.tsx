import Toasty, { ToastyIN } from '@/components/ui/toast';
import { ip, port } from '@/imports/overall';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const screen = Dimensions.get("screen")

export default function LoginScreen() {
  const [username,setUsername] = useState('')
  const [password,setPassword] = useState('')
  const [toast,setToast] = useState<ToastyIN | null>(null)

  useEffect(()=>{
    checkToken()
  },[])

  const checkToken = async() =>{
    const token = await AsyncStorage.getItem('token')
    if (token) {
      router.replace('/(tabs)')
    }
  }

  const login = async() =>{
    Keyboard.dismiss()
    const req = {
        username,password
    }
    try {
      const res = await axios.post(`http://${ip}:${port}/auth/login`,req)
      const data = res.data
      console.log(data)
      sendToast('success',"Login successful !")
      AsyncStorage.setItem('token',data.access_token)
      router.replace('/(tabs)')
    } catch (error) {
      console.error(error)
      sendToast('error',"Username or Password incorrect !")
    }
  }

  const sendToast = (type : 'success'|'error'|'warning'|'info',message : string) =>{
    setToast({type,message})
    setTimeout(()=>{
      setToast(null)
    },5300)
  }

  return (
    <SafeAreaView style={styles.container1}>
      {toast && <Toasty type={toast.type} message={toast.message} />}
      <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                // style={{flex:1}}
          keyboardVerticalOffset={0}
      >
        <Pressable onPress={()=>Keyboard.dismiss()} style={styles.container} >
          <View style={{position:'absolute',top:0}}>
            <Text style={{fontFamily:'courier',fontSize:30,color:'white',margin:0}}>pich</Text>
          </View>
          <View style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minWidth:screen.width*0.8,gap:10}} >
            <Text style={{fontFamily:'Agdasima-Bold',fontSize:50,color:'white',marginBottom:20}}>Login</Text>
            <TextInput onChangeText={setUsername} value={username} placeholder='Username...'style={{width:screen.width*0.8,borderWidth:1,borderColor:'#ffffff31',fontWeight:500,borderRadius:30,paddingHorizontal:20,color:'white',paddingVertical:15,backgroundColor:'rgba(255, 255, 255, 0.12)'}} />
            <View style={{width:5,height:10,borderRadius:10,backgroundColor:'rgba(255, 255, 255, 0.12)'}} ></View>
            <TextInput onChangeText={setPassword} value={password} secureTextEntry placeholder='Password...'style={{width:screen.width*0.8,borderWidth:1,borderColor:'#ffffff31',fontWeight:500,borderRadius:30,paddingHorizontal:20,color:'white',paddingVertical:15,backgroundColor:'rgba(255, 255, 255, 0.12)'}} />
            <TouchableOpacity onPress={()=>login()} style={{width:screen.width*0.8,backgroundColor:'#2eb7fe',display:'flex',alignItems:'center',borderWidth:1,borderColor:'#ffffff31',justifyContent:'center',paddingHorizontal:20,paddingVertical:11,borderRadius:30}} >
              <Text style={{fontFamily:'Agdasima-Bold',fontSize:20,color:'#101622'}}>Login</Text>
            </TouchableOpacity>
            <Link href='/(auth)/register' style={{fontFamily:'Agdasima',fontSize:16,textDecorationLine:'underline',textDecorationColor:'#1c4062ff',color:'#2eb7fe'}}>Don't have an account?</Link>
          </View>
        </Pressable>
        

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container1: {
    flex: 1,
    backgroundColor: '#101622',
  },
  container: {
    display:'flex',
    flexDirection:'column',
    height:'100%',
    width:'100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor:'#101622',
    position:'relative'
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
