import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SQLite from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect } from 'react';

// SplashScreen.preventAutoHideAsync();


export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    'Agdasima': require('../assets/fonts/Agdasima-Regular.ttf'),
    'Agdasima-Bold': require('../assets/fonts/Agdasima-Bold.ttf'),
  });

  const loadSQLite = async() =>{
    const db = await SQLite.openDatabaseAsync('super_db');
    // await db.execAsync('DROP TABLE chats;');
    await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      anchor TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      description TEXT,
      key TEXT,
      notif_id TEXT,
      user_id TEXT,
      last_message TEXT,
      last_sender TEXT
    );
    `);
    // CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY NOT NULL, chat_id INTEGER ,  TEXT NOT NULL, date TEXT, name TEXT, key TEXT, notif_id TEXT);
    // const result = await db.runAsync('INSERT INTO tasks (id, title, date, priority, completed) VALUES (?, ?, ?, ?, ?)', Date.now(),'aaa','aaa','aaa', true);
    // console.log(result)
  }

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
    loadSQLite()
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ title: 'Auth', headerShown: false,animation:'slide_from_right' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
