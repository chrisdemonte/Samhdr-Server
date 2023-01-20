//const http = require('http')
const port = 2020
const fs = require("fs");
const https = require("https")
const sio = require("socket.io")
//import { createServer } from "https";
//import { Server } from "socket.io";

const httpsServer = https.createServer({
  key: fs.readFileSync("./ssl/samhdr-sever-key-pair.pem")
    
    
 // cert: fs.readFileSync("./ssl/samhdr-server-cert.pem"),
 // requestCert: true,
 // ca: [
 //   fs.readFileSync("./ssl/samhdr-cert.pem")
 // ]
}
);
//const io = require('socket.io')(port, {cors : {origin : "*"}})
const io = new sio.Server(httpsServer, {cors : {origin : "*"}})
//const url = require('url')
console.log("Listening on port "+ port)
/**
 * An array of player data for the sockets connect to the server
 * Struct { socketId : string, playerName : string, state: int}
 * state : {0 = not ready, 1 = ready, 2 = in a match}
 */
var playerData = {}
var keys = []
/*
var id ="123"
var name = "chris"
var id2 = "345"
createPlayer(id , name, 1)

console.log(playerData[id].incomingChallenges[id2])

updateIncomingChallenge(id, "conner", id2)

console.log(playerData[id].incomingChallenges[id2])

deleteIncomingChallenge(id, id2)

console.log(playerData[id].incomingChallenges[id2])
*/

//Updates the player information for a given socket id
function createPlayer(id, name, state){
    playerData[id] = {
        //"id": id,
        "name" : name,
        "state" : state,
        "incomingChallenges" : {},
        "challengeKeys" : []
       // "outGoingChallenges" : {}
    }
    keys.push(id)
    /*
    for (let i = 0; i < players.length; i++){
        if (players[i].id == id){
            players[i].name = name
            players[i].state = state
            players[i].outgoingChallenges = []
            players[i].incomingChallenges = []
        }
    }*/
}
function updatePlayerData(id, key, value){
    playerData[id][key] = value
}
function deletePlayer(socketId){
    delete playerData[socketId]
    keys = keys.filter((e)=> {return e !== socketId})
}

function updateIncomingChallenge(challengeeId, challengerName, challengerId){
    //console.log(playerData[challengeeId].incomingChallenges)
    playerData[challengeeId].incomingChallenges[challengerId] = challengerName
    playerData[challengeeId].challengeKeys.push(challengerId)
}
function deleteIncomingChallenge(challengeeId, challengerId){
    delete playerData[challengeeId].incomingChallenges[challengerId]
    playerData[challengeeId].challengeKeys = playerData[challengeeId].challengeKeys.filter((e) => {return e !== challengerId})
}
/*
function updateOutgoingChallenge(challengerId, challengeeName, challengeeId){
    playerData[challengerId].outgoingChallenges.push({challengeeId, challengeeName})
}
*/
function clearChallenges(id){
    playerData[id].incomingChallenges = {}
    playerData[id].challengeKeys = []
   // playerData[id].outGoingChallenges = []

}

function playCardInteraction (offenseCard, defenseCard){
    let damage_heal = [0,0]

    //if the offense card is a healing card
    if (offenseCard.suit === 4){
        //if the defensive card is healing or resistance we mitigate healing
        if (defenseCard.suit === 4 || defenseCard.suit === 6){
            damage_heal[1] = offenseCard.value - defenseCard.value
            // set negative healing to 0
            if (damage_heal[1] < 0){
                damage_heal[1] = 0
            }
        }
        //else the healing was not countered
        else {
            damage_heal[1] = offenseCard.value
        }
        return damage_heal
    }
    //else if the offense card suit is a non-healing suit
    else {
        //if the offense and defense cards have the same suit, we mitigate damage
        if (offenseCard.suit === defenseCard.suit){
            damage_heal[0] = offenseCard.value - defenseCard.value 
        }
        //if offensive card is sword or arrow and defense card is defense, we mitigate damage
        else if ((offenseCard.suit === 1 || offenseCard.suit === 2) && defenseCard.suit === 5){
            damage_heal[0] = offenseCard.value - defenseCard.value 
        }
        //if offensive card is magic and defense card is resistance, we mitigate damage
        else if (offenseCard.suit === 3 && defenseCard.suit === 6){
            damage_heal[0] = offenseCard.value - defenseCard.value 
        }
        //if offensive card is defense and defensive card is magic or heal, we mitigate damage
        else if (offenseCard.suit === 5 && (defenseCard.suit === 3 || defenseCard.suit ===4)){
            damage_heal[0] = offenseCard.value - defenseCard.value 
        }
        //if offensive card is resistance and defensive card is sword or arrow, we mitigate damage
        else if (offenseCard.suit === 6 && (defenseCard.suit === 1 || defenseCard.suit ===2)){
            damage_heal[0] = offenseCard.value - defenseCard.value 
        }
        // the damage was not countered
        else {
            damage_heal[0] = offenseCard.value
        }
        // set negative damage to no damage
        if (damage_heal[0] < 0){
            damage_heal[0] = 0
        }
        return damage_heal
    }
}
/**
 * On Connection:
 * - The server creates a spot for the client on the player list
 * - Server side listeners are added to the connected socket for all socket events
 */
io.on("connection", socket =>{
    console.log("Connected to " + socket.id)
    //adding the socket to the socket list, but setting it in a "not ready" state
    createPlayer(socket.id, "", 0)
    

    // On Message: test event that console.logs a message from the socket
    socket.on("message", message => {
        console.log(message)    
    })

    
    socket.on("disconnect", (reason) =>{
        if (playerData[socket.id].state === 2){
            io.in(playerData[socket.id].challengeKeys[0]).emit("opponent-disconnected")
        }
        //console.log("Disconnected: " + reason)
        deletePlayer(socket.id)
        socket.disconnect()
        io.emit("room-data", playerData, keys)
       
        
    })
    
    /*
     * On Join Room:
     * - Client-side the player has picked a name and set their card selection
     * - Server updates the player's state in the player list to a "ready" state
     * and sends an updated player list to all sockets connected to the server 
     */ 
    socket.on("join-room", (name, state) =>{
        //console.log("***********************JOIN ROOM *****************************")
        //console.log(playerData)
        updatePlayerData(socket.id, "name", name)
        updatePlayerData(socket.id, "state", state)
        clearChallenges(socket.id)
        io.emit("room-data", playerData, keys)
    })

    /**
     * On Send-Challenge:
     * - Client-side a player has selected another player to challenge
     * - Recieve the name of the challenger and the socket ID of the player
     * being challenged
     * - Emit a "recieve-challenge" message to the player being challenged
     */
    
    socket.on("send-challenge", (challengerName, challengeeId) =>{
        updateIncomingChallenge(challengeeId, challengerName, socket.id)
        //updateOutgoingChallenge(socket.id, challengeeName, challengeeId)
        //console.log("***********************SEND CHALLENGE *****************************")
        //console.log(playerData)
        io.to(challengeeId).emit("room-data", playerData, keys)
        io.to(socket.id).emit("room-data", playerData, keys)
    })

    /**
     * On Accept-Challenge:
     * -Event takes in the name of the challenger and the name and id of the
     * player being challenged
     * -Client-side the player who was challenged accepted the challenge
     * -Generate a random number between 1 and 0 to select who moves first during a game
     * -Send a challenge-accepted message to both players
     * -Update the player list and send a message to all sockets
     */
    
    socket.on("accept-challenge", (challengeeName, challengerName, challengerId) =>{

        //incase the challenger has already entered a match with a different player, 
        //we do not innitiate match

        if (playerData[challengerId] === undefined || playerData[challengerId].state === 2){
            deleteIncomingChallenge(socket.id, challengerId)
            io.to(socket.id).emit("room-data", playerData, keys)
            return
        }
        else {
            //generate a random number (0 - 1): 
            // 0 challengee moves second, 1 challengee moves first
            let challengeeMovesFirst = Math.floor(Math.random() * 2)
            //set challengerMoves first to the opposite value of challengeeMovesFirst
            let challengerMovesFirst = (challengeeMovesFirst + 1) % 2

            //send the challenge accepted message to the challenger
            io.in(challengerId).emit("challenge-accepted", challengeeName, socket.id, challengerMovesFirst)
            //send the challenge accepted message to the person who was challenged
            io.in(socket.id).emit("challenge-accepted", challengerName, challengerId, challengeeMovesFirst)

            //set the player data to reflect that they are in a match
            updatePlayerData(socket.id, "state", 2)
            clearChallenges(socket.id)
            updateIncomingChallenge(socket.id, challengerName, challengerId)

            updatePlayerData(challengerId, "state", 2)
            clearChallenges(challengerId)
            updateIncomingChallenge(challengerId, challengeeName, socket.id)
        }

        //update all clients' room data
        io.emit("room-data", playerData, keys)
    })

    /**
     * On deny-challenge:
     * - CLient-side the player being challenged denied the challenge request
     * - Send a message to the challenger that their request was denied
     * - Send a message to the denier to update their room
     */
    
    socket.on("deny-challenge", (challengerId) =>{

        deleteIncomingChallenge(socket.id, challengerId)
        //sending message to the denied challenger
        //io.in(challengerId).emit("challenge-denied", denyerName, socket.id)
        //sending message to the player who denied the challenge
        //io.in(socket.id).emit("remove-challenger")
        io.in(challengerId).emit("room-data", playerData, keys)
        io.in(socket.id).emit("room-data", playerData, keys)
    })

    //io.to(socket.id).emit("success")
    socket.on("select-card", (slot, opponentSocket) =>{
        io.in(opponentSocket).emit("opponent-select-card", slot)
    })
    socket.on("used-play-card", (opponentSocket, index, selectedCard)=>{
        io.in(opponentSocket).emit("opponent-used-play-card", index, selectedCard)
    })
    socket.on("end-phase-play-card", (playerCard, opponentCard, opponentSocket) =>{
        let damage_heal = playCardInteraction( playerCard, opponentCard)
        //puts a 3 second delay on the server response so the players get a chance to see what the opponent played
        setTimeout(
            () => {
                // first parameter states who was the offensive player who triggered the end-phase. 1 = player, 0 = opponent
                io.in(socket.id).emit("end-phase-play-card", 1, damage_heal);
                io.in(opponentSocket).emit("end-phase-play-card", 0, damage_heal)
            },
            3000)


    })
    socket.on("used-play-face-down", (opponentSocket, index, selectedCard)=>{
        io.in(opponentSocket).emit("opponent-used-play-face-down", index, selectedCard)
    })
    socket.on("end-phase-play-face-down", (playerCard, opponentCard, opponentSocket)=>{
        let pCard = playerCard.card
        opponentCard.value = Math.ceil(opponentCard.value * 1.5)

        let damage_heal = playCardInteraction(pCard, opponentCard)
        let counters = [0,0,0,0,0,0,0]
        if (pCard.suit == 4){
            counters[4] = damage_heal[1]
        }
        else {
            counters[pCard.suit] = damage_heal[0]
        }
        io.in(socket.id).emit("reveal-card", 1)
        io.in(opponentSocket).emit("reveal-card", 0)
        setTimeout(
            () => {
                // first parameter states who was the offensive player who triggered the end-phase. 1 = player, 0 = opponent
                io.in(socket.id).emit("end-phase-play-face-down", 1, counters);
                io.in(opponentSocket).emit("end-phase-play-face-down", 0, counters)
            },
            3000)
    })

    socket.on("used-stack-0", (opponentSocket, cardIndex, selectedCard)=>{
        io.in(opponentSocket).emit("opponent-used-stack-0", cardIndex)
    })
    socket.on("used-stack-1", (opponentSocket)=>{
        io.in(opponentSocket).emit("opponent-used-stack-1")
    })
    socket.on("end-phase-stack", (opponentCard, opponentSocket) =>{
        
        let damage_heal = [0,0]
        if (opponentCard.suit === 4){
            damage_heal[1] = opponentCard.value
        }
        else {
            damage_heal[0] = opponentCard.value
        }
       // console.log("opponent card" + opponentCard.value)
        
       // console.log(damage_heal)
        setTimeout(
            () => {
                // first parameter states who was the offensive player who triggered the end-phase. 1 = player, 0 = opponent
                io.in(socket.id).emit("end-phase-stack", 1, damage_heal);
                io.in(opponentSocket).emit("end-phase-stack", 0, damage_heal)
            },
            3000)
    })
    socket.on("used-wildcard", (opponentSocket, selection, selectedCard)=>{
        io.in(opponentSocket).emit("opponent-used-wildcard", selection, selectedCard)
    })
    socket.on("end-phase-wildcard", (opponentCard, opponentSocket) =>{
        
        let damage_heal = [0,0]
        if (opponentCard.suit === 4){
            damage_heal[1] = opponentCard.value
        }
        else {
            damage_heal[0] = opponentCard.value
        }
       // console.log("opponent card" + opponentCard.value)
        
       // console.log(damage_heal)
        setTimeout(
            () => {
                // first parameter states who was the offensive player who triggered the end-phase. 1 = player, 0 = opponent
                io.in(socket.id).emit("end-phase-wildcard", 1, damage_heal);
                io.in(opponentSocket).emit("end-phase-wildcard", 0, damage_heal)
            },
            3000)
    })
    
    socket.on("player-left-match", ()=>{
        if (playerData[socket.id].state === 2){
            io.in(playerData[socket.id].challengeKeys[0]).emit("opponent-disconnected")
            clearChallenges(playerData[socket.id].challengeKeys[0])
            updatePlayerData(playerData[socket.id].challengeKeys[0], "state", 0)

            
        }
        clearChallenges(socket.id)
        updatePlayerData(socket.id, "state", 0)
        io.emit("room-data", playerData, keys)
    })
})
httpsServer.listen(port)

