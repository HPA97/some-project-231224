import React, { useContext, useEffect, useState } from 'react'
import { UserContext, ConnectionInfoContext } from './App';
import { Socket } from 'socket.io-client';
import useDidMount from './Utils';
import {UserType, RoomType} from '../../server/src/index';

/*
const SocketListeningSetup = (socket: Socket | null) => {
    if(!socket) {
        console.error("Game: Expected socket to exist!");
        return;
    }
    socket.on('receive-message', (msg: string) => {
        console.log('SERVER: ' + msg);
    });
}
*/

const Game = () => {
    const didMount = useDidMount()
    const {userId, username} = useContext(UserContext);
    const {socket, isConnected} = useContext(ConnectionInfoContext);

    const [socketReadiness, setSocketReadiness] = useState<boolean>(false);
    const [userInfo, setUserInfo] = useState<UserType>({id: userId, username: username ?? ""})
    const [roomInfo, setRoomInfo] = useState<RoomType | null>(null);
    const [waiting, setWaiting] = useState<Boolean>(false);

    /*
    useEffect(() => {
        if(didMount) {
            SocketListeningSetup(socket);
        }    
      }, [socketReadiness]);
*/      

    const JoinGameRequest = () => {
        setWaiting(true);
        console.log("Bro wants to join a game...");
        socket!.emit("join-game-request", SetupRoom);
    }

    const SetupRoom = (newRoom: RoomType) => {
        console.log("Server has set this room: " + JSON.stringify(newRoom) + " for us");
        setRoomInfo(newRoom);
        setWaiting(false);
    }

    return (
        <>
            <div>Game</div>
            <div>        
                Welcome, {username} with ID: {userId}! {isConnected ? 'Connected to server.' : 'Not connected.'}
            </div>
            <button hidden={socketReadiness} onClick={() => {
                setSocketReadiness(true);
                JoinGameRequest();
            }}> Search for game </button>
            <button hidden={!socketReadiness} onClick={() => {
                if(!socket) return;
                socket.emit("test", SetupRoom);
            }}>Test</button>
            {waiting ? <h2>Waiting for a match...</h2> : null}
        </>    
  )
}

export default Game