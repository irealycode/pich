import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function ChatLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack
        screenOptions={{
            headerShown: false,
        }}
        >
            <Stack.Screen name="index" options={{ title: 'Chat' }} />
            <Stack.Screen name="chat_details" options={{ title: 'Chat' }} />
        </Stack>
    </GestureHandlerRootView>
  );
}