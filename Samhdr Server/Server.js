//const http = require('http')
const port = 22222
const io = require('socket.io')(port, {cors : {origin : "*"}})
//const url = require('url')

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
/**
 * On Connection:
 * - The server creates a spot for the client on the player list
 * - Server side listeners are added to the connected socket for all socket events
 */
io.on("connection", socket =>{
    //console.log(socket.id)
    //adding the socket to the socket list, but setting it in a "not ready" state
    createPlayer(socket.id, "", 0)
    

    // On Message: test event that console.logs a message from the socket
    socket.on("message", message => {
        console.log(message)    
    })
    
    /*
     * On Join Room:
     * - Client-side the player has picked a name and set their card selection
     * - Server updates the player's state in the player list to a "ready" state
     * and sends an updated player list to all sockets connected to the server 
     */ 
    socket.on("join-room", (name, state) =>{
        console.log("***********************JOIN ROOM *****************************")
        console.log(playerData)
        updatePlayerData(socket.id, "name", name)
        updatePlayerData(socket.id, "state", state)
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
        console.log("***********************SEND CHALLENGE *****************************")
        console.log(playerData)
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
    
    socket.on("accept-challenge", (challengeeName, challengerName, challengerID) =>{

        //generate a random number (0 - 1): 
        // 0 challengee moves second, 1 challengee moves first
        let challengeeMovesFirst = Math.floor(Math.random * 2)
        //set challengerMoves first to the opposite value of challengeeMovesFirst
        let challengerMovesFirst = (challengeeMovesFirst + 1) % 2

        //send the challenge accepted message to the challenger
        io.in(challengerID).emit("challenge-accepted", challengeeName, socket.id, challengerMovesFirst)
        //send the challenge accepted message to the person who was challenged
        io.in(socket.id).emit("challenge-accepted", challengerName, challengerID, challengeeMovesFirst)

        //set the player data to reflect that they are in a match
        updatePlayerData(socket.id, "state", 2)
        clearChallenges(socket.id)
        updatePlayerData(challengerID, "state", 2)
        clearChallenges(challengerID)

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
    
})

