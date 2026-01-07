import Toasty, { ToastyIN } from '@/components/ui/toast';
import { ip, port } from '@/imports/overall';
import axios from 'axios';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Dimensions, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const screen = Dimensions.get("screen")

type UsernameValidationResult = {
  valid: boolean;
  reason?: string;
};

export function validateUsername(username: string): UsernameValidationResult {
  if (!username) {
    return { valid: false, reason: 'Username is required' };
  }

  const trimmed = username.trim();

  if (trimmed.length < 3 || trimmed.length > 20) {
    return { valid: false, reason: 'Username must be 3–20 characters long' };
  }

  // letters, numbers, underscore, dot
  const USERNAME_REGEX = /^[a-zA-Z0-9._]+$/;

  if (!USERNAME_REGEX.test(trimmed)) {
    return {
      valid: false,
      reason: 'Only letters, numbers, "." and "_" are allowed',
    };
  }

  // no consecutive dots or underscores
  if (/([._])\1/.test(trimmed)) {
    return {
      valid: false,
      reason: 'No consecutive "." or "_" allowed',
    };
  }

  // cannot start or end with dot or underscore
  if (/^[._]|[._]$/.test(trimmed)) {
    return {
      valid: false,
      reason: 'Username cannot start or end with "." or "_"',
    };
  }

  return { valid: true };
}

export default function RegisterScreen() {
  const [username,setUsername] = useState('')
  const [password,setPassword] = useState('')
  const [passwordConfirm,setPasswordConfirm] = useState('')
  const [toast,setToast] = useState<ToastyIN | null>(null)

  const register = async() =>{
    Keyboard.dismiss()
    const validate = validateUsername(username)
    if (!validate.valid) {
      sendToast('error',validate.reason??'')
      return
    }
    if (password.length < 8) {
      sendToast('error','Password should be longer than 8 !')
      return
    }
    if (password !== passwordConfirm) {
      sendToast('error',"Passwords don't match !")
      return
    }

    const req = {
        username,password
    }
    try {
      const res = await axios.post(`http://${ip}:${port}/auth/register`,req)
      const data = res.data
      console.log(data)
      sendToast('success',"Register successful !")
    } catch (error) {
      console.error(error)
      sendToast('error',"There has been some Network errors")
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
                    <Text style={{fontFamily:'Agdasima-Bold',fontSize:50,color:'white',marginBottom:20}}>Sign Up</Text>
                    <TextInput onChangeText={setUsername} value={username} placeholder='Username...'style={{width:screen.width*0.8,borderWidth:1,borderColor:'#ffffff31',fontWeight:500,borderRadius:30,paddingHorizontal:20,color:'white',paddingVertical:15,backgroundColor:'rgba(255, 255, 255, 0.12)'}} />
                    <View style={{width:5,height:10,borderRadius:10,backgroundColor:'rgba(255, 255, 255, 0.12)'}} ></View>
                    <TextInput onChangeText={setPassword} value={password} secureTextEntry placeholder='Password...'style={{width:screen.width*0.8,borderWidth:1,borderColor:'#ffffff31',fontWeight:500,borderRadius:30,paddingHorizontal:20,color:'white',paddingVertical:15,backgroundColor:'rgba(255, 255, 255, 0.12)'}} />
                    <View style={{width:5,height:10,borderRadius:10,backgroundColor:'rgba(255, 255, 255, 0.12)'}} ></View>
                    <TextInput onChangeText={setPasswordConfirm} value={passwordConfirm} secureTextEntry placeholder='Confirm Password...'style={{width:screen.width*0.8,borderWidth:1,borderColor:'#ffffff31',fontWeight:500,borderRadius:30,paddingHorizontal:20,color:'white',paddingVertical:15,backgroundColor:'rgba(255, 255, 255, 0.12)'}} />
                    <TouchableOpacity onPress={()=>register()} style={{width:screen.width*0.8,backgroundColor:'#2eb7fe',display:'flex',alignItems:'center',borderWidth:1,borderColor:'#ffffff31',justifyContent:'center',paddingHorizontal:20,paddingVertical:11,borderRadius:30}} >
                      <Text style={{fontFamily:'Agdasima-Bold',fontSize:20,color:'#101622'}}>Register</Text>
                    </TouchableOpacity>
                    <Link href='..' style={{fontFamily:'Agdasima',fontSize:16,textDecorationLine:'underline',textDecorationColor:'#1c4062ff',color:'#2eb7fe'}}>Already with us?</Link>
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
    position:'relative'
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
