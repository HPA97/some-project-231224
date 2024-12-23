import { Server, Socket } from "socket.io";
import {
  UserType, RoomType, 
  ServerResponse, ServerResponseMatter, 
  MatchState, RoundState, 
  RoundStateTime, GameRules, Rules,
  PlayerHand, Card,
  CardSlotUpdate, CardSuit, CreateCard
} from '../../common/types';

const io = new Server(9000, { cors: {origin: ['http://localhost:3000']}});
/*const io = new Server(9000, { cors: {
  origin: ['*'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true, 
}});*/

type ServerMatchState = {
  room: RoomType;
}

// UserId, UserInfo
const userMap = new Map<String, UserType>();
// UserId, Callback for room setup for clients
const waitingUsers: Array<{UserId: String, Callback: (responsePayload: ServerResponse) => void}> = Array();
// RoomId, RoomInfo
const roomInUse = new Map<String, RoomType>();

let userCount = 0;
let roomCount = 0;

const OnConnection = (socket: Socket) => {
  let socketId = socket.id;
  console.log(socketId)
  let temporaryUsername = "loser_" + userCount++;
  console.log(temporaryUsername);
  userMap.set(socketId, {id:socketId, username:temporaryUsername})
}

io.on("connection", (socket) => {
  OnConnection(socket);

  socket.on("register-user", (userId: String, username: String) => {
    const entry = userMap.get(userId);
    if(!entry) {
      console.error("register-user: User has not connected before calling register-user")
      return;
    }
    if(username === "") {
      console.log("register-user: No Username registered, using default")
      username = entry.username;
    }
    console.log("register-user with userid: " + userId + " , username: " + username);
    userMap.set(userId, {id:userId, username:username})
  });

  socket.on('join-game-request', (callback: (responsePayload: ServerResponse) => void) => {
    console.log(socket.id + " wants to join a game")
    const otherUser = waitingUsers.pop();
    if(!otherUser) {
      waitingUsers.push({UserId: socket.id, Callback: callback});
      return;
    }
    const playerA: UserType = userMap.get(otherUser.UserId)!;
    const playerB: UserType = userMap.get(socket.id)!;
    const newMatch: MatchState = {
      round: 0, 
      roundState: RoundState.IS_ROUND_START, 
      roundPartTimerMilliseconds: RoundStateTime.get(RoundState.IS_ROUND_START) ?? 0,
      playerAHands: {cards: GameRules.startingHand},
      playerBHands: {cards: GameRules.startingHand},
      playerABoardSlots: [null, null, null, null, null, null],
      playerBBoardSlots: [null, null, null, null, null, null],
      isPlayerA: true
    };
    const newRoom: RoomType = {
      id: roomCount++,
      playerA: playerA,
      playerB: playerB,
      matchState: newMatch,
      finished: false
    };
    roomInUse.set(newRoom.id.toString(), newRoom);
    const matchState: ServerMatchState = {room: newRoom};
    const response: ServerResponse = {
      matter: ServerResponseMatter.NEW_ROOM_SETUP, 
      newRoom: newRoom
    };
    const responseForPlayerA = washResponse(true, response);
    const responseForPlayerB = washResponse(false, response);
    otherUser.Callback(responseForPlayerA);
    callback(responseForPlayerB);
    startRoundPartTimer(matchState, socket);
  })

  socket.on("slot-update-event", (slotUpdate: CardSlotUpdate) => {
    console.log("match-event: from socketid: " + socket.id);
    console.log("match-event: from slotUpdate playerId: " + slotUpdate.playerId);
    console.log("match-event: " + JSON.stringify(slotUpdate));
    const room = roomInUse.get(slotUpdate.roomId.toString());
    console.log("match-event room of relevance: " + JSON.stringify(room));
    if(!room) {
      console.error("match-event: No room found for roomId: " + slotUpdate.roomId);
      return;
    }
    const playerId = slotUpdate.playerId;
    if(socket.id !== playerId) {
      console.error("match-event: PlayerId does not match socket.id");
      return;
    }
    const isPlayerA = playerId == room.playerA.id.toString();
 
    if(isPlayerA) {
      room!.matchState.playerABoardSlots[slotUpdate.slotId] = slotUpdate.card;
      room!.matchState.playerAHands.cards = room!.matchState.playerAHands.cards.filter((card) => card.id !== slotUpdate.card!.id);
    } else {
      room!.matchState.playerBBoardSlots[slotUpdate.slotId] = slotUpdate.card;
      room!.matchState.playerBHands.cards = room!.matchState.playerBHands.cards.filter((card) => card.id !== slotUpdate.card!.id);
    }
    console.log("Room to update with: " + JSON.stringify(room));
    roomInUse.set(slotUpdate.roomId.toString(), room);
    const test = roomInUse.get(slotUpdate.roomId.toString());
    console.log("Room after update: " + JSON.stringify(test));
  });

  socket.on("steal-slot-update-event", (slotUpdate: CardSlotUpdate) => {
    console.log("steal-slot-update-event: from socketid: " + socket.id);
    const room = roomInUse.get(slotUpdate.roomId.toString());
    if(!room) {
      console.error("steal-slot-update-event: No room found for roomId: " + slotUpdate.roomId);
      return;
    }
    const playerId = slotUpdate.playerId;
    if(socket.id !== playerId) {
      console.error("steal-slot-update-event: PlayerId does not match socket.id");
      return;
    }
    const isPlayerA = playerId == room.playerA.id.toString();

    let stolenCard = null;
    if(isPlayerA) {
      stolenCard = room!.matchState.playerBBoardSlots[slotUpdate.slotId];
      room!.matchState.playerBBoardSlots[slotUpdate.slotId] = null;
      //io.to(socket.id.toString()).emit('steal-slot-result', stolenCard);      
      if(stolenCard !== null) room!.matchState.playerAHands.cards.push(stolenCard!);
    } else {
      stolenCard = room!.matchState.playerABoardSlots[slotUpdate.slotId];
      room!.matchState.playerABoardSlots[slotUpdate.slotId] = null;
      //io.to(socket.id.toString()).emit('steal-slot-result', stolenCard);
      if(stolenCard !== null) room!.matchState.playerBHands.cards.push(stolenCard!);
    }

    io.to(socket.id.toString()).emit('steal-slot-result', { resultCard: stolenCard, slotId: slotUpdate.slotId });


    console.log("Room to update with: " + JSON.stringify(room));
    roomInUse.set(slotUpdate.roomId.toString(), room);
    const test = roomInUse.get(slotUpdate.roomId.toString());
    console.log("Room after update: " + JSON.stringify(test));

  });

});

function washResponse(isPlayerA: Boolean, response: ServerResponse): ServerResponse {
  const newResponse = JSON.parse(JSON.stringify(response));  
  if (newResponse.newRoom && newResponse.newRoom.matchState) {
    const matchState = newResponse.newRoom.matchState;    
    if (isPlayerA) {
      delete matchState.pointsPlayerB;
    }    
    if (!isPlayerA) {
      newResponse.newRoom.matchState.isPlayerA = false;
      delete matchState.pointsPlayerA;
    }
  }
  return newResponse;
}

function startRoundPartTimer(matchState: ServerMatchState, socket: Socket) {  
  const room = matchState.room;
  const roomId = room.id.toString();
  const roundDuration = room.matchState.roundPartTimerMilliseconds;
  //console.log(`Room ${roomId} created. Starting game countdown.`);  

  setTimeout(() => {
    //console.log(`Round part in room ${roomId} is over.`);
    if(
      room.matchState.roundState === RoundState.IS_GAME_OVER 
      || room.matchState.roundState === RoundState.UNKNOWN
    ) {
      // Mark the room as finished
      room.finished = true;
      roomInUse.set(roomId, room); // TODO Maybe just remove it instead?
      return;
    }
    const newMatchState = GameRules.goNextRoundPart(room.matchState);
    room.matchState = newMatchState;
    const response: ServerResponse = {
      matter: ServerResponseMatter.NEXT_ROUND_PART, 
      newRoom: room
    };
    //console.log("Giving response for matchState: " + JSON.stringify(matchState));
    const responseForPlayerA = washResponse(true, response);
    const responseForPlayerB = washResponse(false, response);    
    io.to(matchState.room.playerA.id.toString()).emit('response', responseForPlayerA);
    io.to(matchState.room.playerB.id.toString()).emit('response', responseForPlayerB);
    
    startRoundPartTimer(matchState, socket);
  }, roundDuration);
}