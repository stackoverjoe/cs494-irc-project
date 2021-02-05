const express = require("express");
const { v4: uuidv4 } = require("uuid");
const date = require("date-and-time");

const port = 4000;
var app = express();
const server = app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
const io = require("socket.io")(server);

//Keep track of room hosts and participants
let rooms = new Map();
let roomhosts = new Map();

//Keep track of online users
let users = [];
let roomsArray = [];

// var outTime = date.format(currentTime, 'hh:mm:ss A')
app.use(express.static("public"));
app.set("view engine", "ejs");

app.get("/", function (req, res) {
  res.render("index");
});

io.on("connection", (socket) => {
  //Keep track of socketId for room management, every user is a member of their own room which they start as
  //the only participant
  var userId = socket.id;
  console.log(`New Connection ${socket.id}`);

  //Give user a random username
  myUserName = socket.username = "User" + Math.floor(Math.random() * 2000 + 1);
  users.push({username: socket.username});
  //roomsArray.push({sid: socket.id, username: socket.username})

  //Init browser local values for self identification/persistence
  socket.emit("newUserInit", {name: socket.username, sid: socket.id})

  io.sockets.emit("updateUser", {
    users: users,
  });

  io.sockets.emit("updateRooms", {
      all: roomsArray
  })

  socket.on("createRoom", (data) => {
    socket.join(data.roomName)
    console.log(`${data.name}: ${socket.id} has created the room ${data.roomName}`)

    //UI info
    roomsArray.push({sid: socket.id, username: socket.username, roomName: data.roomName})
    //Server room logic maps
    rooms.set(data.roomName, [socket.id]);
    roomhosts.set(socket.id, data.roomName);

    //Update client room info
    io.sockets.emit("updateRooms", {
        all: roomsArray
    })
  })

  socket.on("joinRoom", (data) => {
    socket.join(data.roomToJoin)
    let newRoomMates = rooms.get(data.roomToJoin)
    newRoomMates.push(socket.id) 
    rooms.set(data.roomToJoin, newRoomMates)
    console.log(`${data.user}: ${socket.id} has joined room ${data.roomToJoin}`)
    socket.emit("joinedRoomStatus", {
      status: "joined",
      roomJoined: data.roomToJoin
    })
  })

  socket.on("whoAmI", () => {
    socket.emit("whoAmI", { name: socket.username });
  });

  //On a disconnect remove the host's room and disconnect other participants from the room.
  socket.on("disconnect", () => {
    console.log(`${userId} had disconnected from the server.`);
    rooms.delete(userId);
    users = users.filter((name) => name.username !== socket.username);
    roomsArray = roomsArray.filter((room) => room.sid !== socket.id)
    io.sockets.emit("removeUser", {
      name: socket.username,
    });
    io.sockets.emit("removeRoom", {
        roomId: socket.id
    })
  });
});
