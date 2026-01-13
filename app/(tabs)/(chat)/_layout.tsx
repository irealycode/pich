import { Stack } from 'expo-router';

export default function ChatLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
        <Stack.Screen name="index" options={{ title: 'Chat' }} />
        <Stack.Screen name="chat_details" options={{ title: 'Chat' }} />
    </Stack>
  );
}