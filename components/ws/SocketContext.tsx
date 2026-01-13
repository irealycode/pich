import { ip, port } from '@/imports/overall';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef } from 'react';

type SocketContextType = {
  send: (data: any) => void;
  onMessage: (callback: (data: any) => void) => void;
};

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const ws = useRef<WebSocket | null>(null);
    const listeners = useRef<((data: any) => void)[]>([]);
    useEffect(() => {
        AsyncStorage.getItem('token').then((t)=>{
            ws.current = new WebSocket(
                `ws://${ip}:${port}/ws?token=${t}`
            );

            ws.current.onopen = () => {
            console.log('WS connected');
            };

            ws.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                listeners.current.forEach((cb) => cb(data));
            };

            ws.current.onclose = () => {
            console.log('WS closed');
            };
        })
        

        return () => {
        ws.current?.close();
        };
    }, []);

    const onMessage = (callback: (data: any) => void) => {
        listeners.current.push(callback);
        return () => {
            listeners.current = listeners.current.filter((cb) => cb !== callback);
        };
    };

    const send = (data: any) => {
        ws.current?.send(JSON.stringify(data));
    };

    return (
        <SocketContext.Provider value={{ send, onMessage }}>
        {children}
        </SocketContext.Provider>
    );
}

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
  return ctx;
};
