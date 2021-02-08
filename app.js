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
  function destroyRoom(data) {
    let usersToRemove = rooms.get(data.roomToDelete);
    if (usersToRemove) {
      usersToRemove.map((user) => {
        io.of("/").sockets.get(user).leave(data.roomToDelete);
        console.log(`Removed ${user} from ${data.roomToDelete}`);
      });
    }
    roomhosts.delete(socket.id);
    io.sockets.emit("removeRoom", { roomId: socket.id });
  }

  //Keep track of socketId for room management, every user is a member of their own room which they start as
  //the only participant
  var userId = socket.id;
  console.log(`New Connection ${socket.id}`);

  //Give user a random username
  myUserName = socket.username = "User" + Math.floor(Math.random() * 2000 + 1);
  users.push({ username: socket.username });
  //roomsArray.push({sid: socket.id, username: socket.username})

  //Init browser local values for self identification/persistence
  socket.emit("newUserInit", { name: socket.username, sid: socket.id });

  io.sockets.emit("updateUser", {
    users: users,
  });

  io.sockets.emit("updateRooms", {
    all: roomsArray,
  });

  socket.on("sendMessage", (data) => {
    console.log(data.roomToMessage);
    console.log(data.message);
    io.to(data.roomToMessage).emit("roomMessage", {
      message: data.message,
      from: data.from,
      sid: socket.id,
      roomToMessage: data.roomToMessage,
    });
  });

  socket.on("getMembers", (data) => {
    let requestedMembers = rooms.get(data.room);
    if (requestedMembers) {
      requestedMembers = requestedMembers.map((mem) => {
        let s = io.of("/").sockets.get(mem);
        return { username: s.username, id: s.id };
      });
    }
    socket.emit("requestMemberResponse", {
      members: requestedMembers,
      room: data.room,
    });
  });

  socket.on("createRoom", (data) => {
    socket.join(data.roomName);
    console.log(
      `${data.name}: ${socket.id} has created the room ${data.roomName}`
    );

    //No duplicate room names allowed
    if (rooms.get(data.roomName)) {
      return;
    }

    //UI info
    roomsArray.push({
      sid: socket.id,
      username: socket.username,
      roomName: data.roomName,
    });
    //Server room logic maps
    rooms.set(data.roomName, [socket.id]);
    roomhosts.set(socket.id, data.roomName);

    //Update client room info
    io.sockets.emit("updateRooms", {
      all: roomsArray,
    });
  });

  socket.on("leaveRoom", (data) => {
    socket.leave(data.roomToLeave);
    let newRoomMates = rooms.get(data.roomToLeave);
    if(newRoomMates){
      newRoomMates = newRoomMates.filter((user) => user !== socket.id);
      rooms.set(data.roomToLeave, newRoomMates);
    }
    socket.emit("joinedRoomStatus", {
      roomLeft: data.roomToLeave,
      status: "left",
    });
  });

  socket.on("joinRoom", (data) => {
    socket.join(data.roomToJoin);
    let newRoomMates = rooms.get(data.roomToJoin);
    newRoomMates.push(socket.id);
    rooms.set(data.roomToJoin, newRoomMates);
    console.log(
      `${data.user}: ${socket.id} has joined room ${data.roomToJoin}`
    );
    socket.emit("joinedRoomStatus", {
      status: "joined",
      roomJoined: data.roomToJoin,
    });
  });

  socket.on("whoAmI", () => {
    socket.emit("whoAmI", { name: socket.username });
  });

  socket.on("deleteRoom", (data) => {
    destroyRoom(data);
  });

  //On a disconnect remove the host's room and disconnect other participants from the room.
  socket.on("disconnect", () => {
    console.log(`${userId} has disconnected from the server.`);
    users = users.filter((name) => name.username !== socket.username);
    roomsArray = roomsArray.filter((room) => room.sid !== socket.id);
    // let maybeRoom = roomhosts.get(socket.id)
    // if(maybeRoom){
    //   roomhosts.delete(socket.id)
    // }

    //Remove users from all rooms TODO: check if they are hose i.e position 0
    for (const [key, value] of rooms.entries()) {
      let updatedUsers = value.filter((leaverSid) => leaverSid !== socket.id);
      if (updatedUsers.length <= 0) {
        rooms.delete(key);
      } else if (updatedUsers.length < value.length) {
        rooms.set(key, updatedUsers);
      }
      console.log(rooms);
    }

    let maybeRoom = roomhosts.get(socket.id);
    if (maybeRoom) {
      destroyRoom({ roomToDelete: maybeRoom, roomId: socket.id });
    }

    io.sockets.emit("removeUser", {
      name: socket.username,
    });
    io.sockets.emit("removeRoom", {
      roomId: socket.id,
    });
  });
});
