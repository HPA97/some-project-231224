'use client';
import React, { createContext, useContext, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Game from './Game_OLD';

type SocketContextType = {
    socket: Socket | null;
    isConnected: boolean;
    connectToServer: () => void;
};

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
    connectToServer: () => {},
});

const GameContext: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const socketRef = useRef<Socket | null>(null); // Socket can be null initially
    const [isConnected, setIsConnected] = useState(false);

    const connectToServer = () => {
        if (socketRef.current) {
            console.warn('Already connected or connecting.');
            return;
        }

        console.log('Connecting to game server');
        socketRef.current = io('http://localhost:9000');

        socketRef.current.on('connect', () => {
            console.log('Client connected as id: ' + socketRef.current!.id);
            setIsConnected(true);
        });

        socketRef.current.on('disconnect', () => {
            console.log('Client disconnected');
            setIsConnected(false);
        });

        socketRef.current.on('receive-message', (msg: string) => {
            console.log('SERVER: ' + msg);
        });
    };

    const disconnectFromServer = () => {
        if (socketRef.current) {
            console.log('Disconnecting from game server');
            socketRef.current.disconnect();
            socketRef.current = null;
            setIsConnected(false);
        }
    };

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, isConnected, connectToServer }}>
            {children}
        </SocketContext.Provider>
    );
};

export default GameContext;

export const useSocket = () => {    
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};
