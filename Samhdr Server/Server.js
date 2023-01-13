const http = require('http')
const port = 22222
const io = require('socket.io')(port, {cors : {origin : "*"}})
const url = require('url')
//const room = require("./Room.js")
//import Player from "Player.js"

var players = []

function prepareForMatch(id, name){
    for (let i = 0; i < players.length; i++){
        if (players[i].id == id){
            players[i].name = name
            players[i].ready = true
        }
    }
}

io.on("connection", socket =>{
    //console.log(socket.id)
    players.push({"id" : socket.id, "name":"", "ready": false})
    socket.on("message", message => {
        console.log(message)
        
    })
    
    socket.on("join-room", name =>{

        prepareForMatch(socket.id, name)
        console.log(players)
       // io.to(socket).emit("room-data", players)
        io.emit("room-data", players)
    })
    socket.on("send-challenge", (challengerName, targetId) =>{
        //console.log(data)
        //console.log("incoming challenge for " + data.id + " from " + data.name)
        io.in(targetId).emit("recieve-challenge", challengerName, socket.id)
    })
    //io.to(socket.id).emit("success")
    
})



/*
var rooms = []

function addRoom(player, pw){
    let place = rooms.length
    rooms.push({index: place, player1 : player, player2 : null, password : pw})
    return rooms[place]
}*/
/*
const server = http.createServer(function(req, res){
    //console.log(req.url)
    request = url.parse(req.url, true)
    pathname = request.pathname
    query = request.query
    //console.log(pathname)
    //console.log(query.name)

    if(pathname == "/connect"){
        console.log("establishing connection")
        res.writeHead(200, {'Conetent-Type': 'application/json', 'Access-Control-Allow-Origin' : '*'})
       // res.write("{message: \"Connected to server successfully.\"} ")
       // res.end()
        res.end("{\"message\": \"Connected to server successfully.\" }")
    }
    else if(pathname == "/join"){
        let room = addRoom(query.name, query.password)
        res.writeHead(200, {'Conetent-Type': 'text/plain'})
        res.write("You have joined room " + (room.index + 1))
        res.write("\n")
        res.write(JSON.stringify(room))
        res.end()
        console.log(rooms)
    }
    else {
        res.writeHead(404, {'Conetent-Type': 'text/plain'})
        res.write("The resource you are looking for does not exist")
        res.end() 
    }
})

server.listen(port, function(error){
    if (error){
        console.log("Server error:", error)
    }
    else {
        console.log("Server is listening on port " + port)
    }
})*/