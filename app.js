const express = require("express");
const { v4: uuidv4 } = require("uuid");
const date = require("date-and-time");
const cors = require("cors");
const ngrok = require("ngrok");

const port = 4000;
var app = express();
const server = app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
const io = require("socket.io")(server);

//Keep track of room hosts and participants
let rooms = new Map();
let roomhosts = new Map();

//Keep track of online users`
let users = [];
let roomsArray = [];

app.use(express.static("public", {
  setHeaders: function(res, path){
    res.set("Access-Control-Allow-Origin", "*");
  }
}));

app.set("view engine", "ejs");

app.get("/", function (req, res) {
  res.render("index");
});

//Function to replace dangerous characters with safe alternative to stop from
//code injection
function sanitize(string) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };
  const reg = /[&<>"'/]/gi;
  return string.replace(reg, (match) => map[match]);
}

//Uncomment this out if you have ngrok credentials and want to make chat available online
// (async function () {
//   try {
//     const url = await ngrok.connect({
//       proto: "http",
//       addr: 4000
//     });
//   } catch (e) {
//     console.log(e);
//   }
// })();

io.on("connection", (socket) => {
  //destroyRoom removes all clients from an outgoing room. Removes the room from the UI supplier.
  function destroyRoom(data) {
    let usersToRemove = rooms.get(data.roomToDelete);
    if (usersToRemove) {
      usersToRemove.map((user) => {
        io.of("/").sockets.get(user).leave(data.roomToDelete);
        console.log(`Removed ${user} from ${data.roomToDelete}`);
      });
    }

    roomhosts.delete(socket.id);
    roomsArray = roomsArray.filter(
      (room) => room.roomName !== data.roomToDelete
    );
    io.sockets.emit("removeRoom", {
      roomId: socket.id,
      roomName: data.roomToDelete,
    });
  }

  //Keep track of socketId for room management, every user is a member of their own room which they start as
  //the only participant
  var userId = socket.id;
  console.log(`New Connection ${socket.id}`);

  //Give user a random username
  myUserName = socket.username = "User" + Math.floor(Math.random() * 2000 + 1);
  users.push({ username: socket.username, sid: socket.id });
  //roomsArray.push({sid: socket.id, username: socket.username})

  //Init browser local values for self identification/persistence
  socket.emit("newUserInit", { name: socket.username, sid: socket.id });

  //Update the UI for list of users for all clients
  io.sockets.emit("updateUser", {
    users: users,
  });

  //Update the UI for list of rooms for all clients
  io.sockets.emit("updateRooms", {
    all: roomsArray,
  });

  //A client has requested to send a message to all users of a particular room
  socket.on("sendMessage", (data) => {
    const now = new Date();
    const time = date.format(now, "h:mm:ss A");
    io.to(data.roomToMessage).emit("roomMessage", {
      message: sanitize(data.message),
      from: data.from,
      sid: socket.id,
      roomToMessage: data.roomToMessage,
      time: time,
    });
  });

  //A function to return all users associated with a particular room.
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

  //A client has requested to create a room.
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

  //Send a list of all rooms upon client request
  socket.on("getRooms", () => {
    socket.emit("getRooms", {
      rooms: roomsArray
    })
  })

  //A client has rquested to leave a room
  socket.on("leaveRoom", (data) => {
    socket.leave(data.roomToLeave);
    let newRoomMates = rooms.get(data.roomToLeave);
    if (newRoomMates) {
      newRoomMates = newRoomMates.filter((user) => user !== socket.id);
      rooms.set(data.roomToLeave, newRoomMates);
    }
    socket.emit("joinedRoomStatus", {
      roomLeft: data.roomToLeave,
      status: "left",
    });
  });

  //A client has requeted to join a room
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

  //A client has requested to delete a room that they created
  socket.on("deleteRoom", (data) => {
    destroyRoom(data);
  });

  //A client has requested to send a message to a particular user
  socket.on("privateMessage", (data) => {
    io.to(data.to).emit("privateMessage", {
      from: data.from,
      message: data.message,
    });
  });

  //On a disconnect remove the host's room and disconnect other participants from the room.
  //This handles all instances of a client losing connection with the server
  socket.on("disconnect", () => {
    console.log(`${userId} has disconnected from the server.`);
    users = users.filter((name) => name.username !== socket.username);
    roomsArray = roomsArray.filter((room) => room.sid !== socket.id);

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
      roomName: maybeRoom,
    });
  });
});
