import { HomeIcon } from '@/assets/svgs/home';
import { SearchIcon } from '@/assets/svgs/Search';
import { SocketProvider } from '@/components/ws/SocketContext';
import { BlurView } from 'expo-blur';
import { Tabs, useNavigation } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';



export default function TabLayout() {
  const prevLength = useRef<number | null>(null);
  const animatedBottom = useSharedValue(20);
  const tabBarStyleAnim = useAnimatedStyle(() => ({
    bottom: animatedBottom.value,
  }));
  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = navigation.addListener('state', (e) => {
      const state = e.data.state;
      if (state && state.routes && state.index !== undefined) {
        const currentRoute = state.routes[state.index];
        if (currentRoute && currentRoute.state && currentRoute.state.index === 0) {
          showTab()
        }
        if (currentRoute && currentRoute.state && currentRoute.state.index === 2) {
          hideTab()
        }
      }
    });

    return unsubscribe;
  }, [navigation]);

  const nav = (navigation : any,name :string) => {
    // if (name === 'chat') {
    //   animatedBottom.value = withTiming(-100, { duration: 300 })
    // }else{
    //   animatedBottom.value = withTiming(20, { duration: 300 })
    // }
    navigation.navigate(name)
  }

  const showTab = () =>{
    animatedBottom.value = withTiming(20, { duration: 300 })
  }
  const hideTab = () =>{
    animatedBottom.value = withTiming(-100, { duration: 300 })
  }
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SocketProvider>
        <Tabs
          screenOptions={{headerShown:false,tabBarInactiveTintColor:'rgba(255, 255, 255, 0.59)',tabBarActiveTintColor:'#fff',tabBarShowLabel:false,tabBarStyle: {
              display:'none'
            },}}
            
            tabBar={({ state, descriptors, navigation }) => (
            <Animated.View style={[styles.wrapper, tabBarStyleAnim]}>
              <BlurView intensity={20} tint="light" style={styles.island}>
                {state.routes.map((route, index) => {
                  const isFocused = state.index === index;
                  if (route.name === "(chat)") return
                  return (
                    <Pressable
                      key={route.key}
                      onPress={() => nav(navigation,route.name)}
                      style={[styles.tab, isFocused && styles.active]}
                    >
                      {descriptors[route.key].options.tabBarIcon?.({
                        focused: isFocused,
                        color: isFocused ? "#ffffffff" : "#ffffff74",
                        size: 22
                      })}
                    </Pressable>
                  );
                })}
              </BlurView>
            </Animated.View>
          )}>
          <Tabs.Screen
            name="index"

            options={{
              title: 'Home',
              headerShown:false,

              tabBarIcon: ({ color, size , focused }) => (
                <View style={{position:'relative',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}} >
                    <HomeIcon color={color} size={size+5} />
                    {/* <Text style={{fontSize:12,color:color,fontFamily:'Agdasima-Bold'}} >Home</Text> */}
                </View>
              ),
            }}
          />
          <Tabs.Screen
            name="searchChats"
            initialParams={{animatedBottom}}
            options={{
              title: 'Chat',
              headerShown:false,
              
              tabBarIcon: ({ color, size , focused }) => (
                <View style={{position:'relative',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}} >
                    <SearchIcon color={color} size={size+5} />
                    {/* <Text style={{fontSize:12,color:color,fontFamily:'Agdasima-Bold'}} >Super</Text> */}
                </View>
              ),
            }}
          />
        </Tabs>
      </SocketProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: '50%',
    transform: [{translateX:'-50%'}],
    right: 0,
    alignItems: "center",
    justifyContent:'center',
    width:140,
    height:70,
    borderRadius: 70,
    overflow:'hidden',
    borderWidth:1,
    borderColor:'#ffffff31'
  },
  island: {
    flexDirection: "row",
    gap: 16,
    height:'100%',
    width:'100%',
    alignItems:'center',
    justifyContent:'center',
    borderRadius: 50,

  },
  tab: {
    padding: 12,
    borderRadius: '100%'
  },
  active: {
    backgroundColor: "rgba(255, 255, 255, 0.09)"
  }
});