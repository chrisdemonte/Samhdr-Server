
class Room {
    index = 0;
    player1 = null;
    player2 = null;
    password = null;

    setIndex(val){
        this.index = val
    }
    setPlayer1(p1){
        this.player1 = p1
    }
    setPlayer2(p2){
        this.player1 = p2
    }
    setPassword(pw){
        this.password = pw
    }

    init = function ir (index, player1, password) { 
        this.setIndex(index)
        this.setPlayer1(player1)
        this.setPassword(password)
    }

    addPlayer2 = function addp2 (player2){
        this.setPlayer2(player2)
    }
}

export default Room
//Test Code
/*
var room1 = new Room()
room1.init(0, null, "shittt")
console.log(room1)*/