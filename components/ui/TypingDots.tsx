import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

export default function TypingAnimation({ dotSize = 10, dotColor = "#333" }) {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  React.useEffect(() => {
    dot1.value = withRepeat(
      withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }, () =>
        withTiming(0, { duration: 500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    dot2.value = 
    withDelay(
        200,
        withRepeat(
            withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }, () =>
            withTiming(0, { duration: 500, easing: Easing.inOut(Easing.ease) })
            ),
            
        -1,
        true
    ))
    dot3.value = 
    withDelay(
        400,
        withRepeat(
            withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }, () =>
            withTiming(0, { duration: 500, easing: Easing.inOut(Easing.ease) })
            ),
        -1,
        true
        ),
    )
  }, []);

  const animatedStyle = dot => useAnimatedStyle(() => ({
    // transform: [{ translateY: dot.value }],
    opacity:dot.value 
  }));

  return (
    <View style={{
    flexDirection: "row",
    gap: 2,
    alignItems: "flex-end",
    justifyContent: "center",
    height: dotSize,
    width:60
  }}>
      <Animated.View style={[styles.dot, { backgroundColor: dotColor, width: dotSize, height: dotSize }, animatedStyle(dot1)]} />
      <Animated.View style={[styles.dot, { backgroundColor: dotColor, width: dotSize, height: dotSize }, animatedStyle(dot2)]} />
      <Animated.View style={[styles.dot, { backgroundColor: dotColor, width: dotSize, height: dotSize }, animatedStyle(dot3)]} />
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    borderRadius: 50,
  },
});
