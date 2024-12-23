'use client';
import React from 'react';
import { useSocket } from './GameContext_OLD'; // Import the hook

const Game: React.FC = () => {
    const { socket, isConnected, connectToServer } = useSocket();

    const handleLogin = () => {
        console.log("yo?");
        if (socket && isConnected) {
            console.log('Reconnecting or sending a login action');
            socket.emit('join-game-request', socket.id);
        } else {
            console.warn('Socket is not connected');
        }
    };

    return (
        <div>
            <button
                className={`text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 focus:outline-none dark:focus:ring-green-800 ${
                    isConnected ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={connectToServer}
                disabled={isConnected}
            >
                {isConnected ? 'Connected' : 'Connect to Server'}
            </button>

            <button
                className={`text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800 ${
                    isConnected ? '' : 'opacity-50 cursor-not-allowed'
                }`}
                onClick={handleLogin}
                disabled={!isConnected}
            >
                {isConnected ? 'Login' : 'Connecting...'}
            </button>
        </div>
    );
};

export default Game;
