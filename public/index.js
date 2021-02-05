$(document).ready(function () {

  let friendlyRoomName = new Map();
  var socket = io.connect("http://localhost:4000", {
    reconnection: false,
    forcedNewConnection: false,
  });
  socket.on("connect", () => {
    `Connected as ${console.log(socket.id)}`;
  });

  let localUsername;
  let createdRoom = false;
  let currentRoom;

  let userList;
  let roomList;
  let onlineUsers = $("#userList");
  let messageBox = $("#messageBox");
  let userButton = $("#onlineUsers");
  let roomsButton = $("#rooms");
  let roomsOnline = $("#roomList");
  let selectedRoom = $("#roomName");
  let roomers = $("#theRooms")
  let createRoom = $("#createRoomButton")

  socket.on("newUserInit", (data) => {
    selectedRoom.text(`Room Id: ${data.sid} (Your room)`);
    localUsername = data.name;
  });

  userButton.click(() => {
    roomsOnline.css("display", "none");
    onlineUsers.css("display", "");
  });

  roomsButton.click(() => {
    onlineUsers.css("display", "none");
    roomsOnline.css("display", "");
  });

  createRoom.click(() => {
    let roomName = $("#roomToCreate").val()
    socket.emit("createRoom", {
      sid: socket.id,
      roomName: roomName,
      name: localUsername
    })
    console.log(roomName)
    $("#createRoomModal").modal("hide")
  })

  socket.on("joinedRoomStatus", data => {
    if(data.status === "joined"){
      $(`#join${data.roomJoined}`).replaceWith(
        `<button id='leave${data.roomJoined}' style='margin-left: auto' type='button' class='btn btn-danger btn-xs roomJoins'>Leave</button>`
      )
      $(`#leave${data.roomJoined}`).click((e) => {
        console.log(e.target.id.substring(5))
      })
    }
    else if(data.status === "left"){

    }
  })

  messageBox.keydown((key) => {
    if (key.keyCode === 13) {
      let chatText = messageBox.val();
      key.preventDefault();
      socket.emit("sendMessage", {
        from: localUsername,
        sid: socket.id,
        message: chatText,
      });
      messageBox.val("");
    }
  });

  socket.on("updateUser", (user) => {
    userList = user.users.map((online) => {
      return `<div id=${online.username} style="display: flex; justify-content: start;" class="container">
        <!-- <img src="/w3images/bandmember.jpg" alt="Avatar" /> -->
        <div id="name${online.username}" styler="align-items: center">${online.username}${
        localUsername === online.username ? " (me)" : ""
      }</div>
      </div>`;
    });
    onlineUsers.html(userList);
  });

  socket.on("updateRooms", (rooms) => {
    roomList = rooms.all.map((room) => {
      return `<div id=room${room.sid} style="display: flex; justify-content: start; align-items: center" class="container">
      <!-- <img src="/w3images/bandmember.jpg" alt="Avatar" /> -->
      <div style="align-items: center">${room.roomName} - ${localUsername === room.username ? "(your room)" : `Host: ${room.username}`}</div>
      ${localUsername !== room.username ?
      `<button id='join${room.roomName}' style='margin-left: auto' type='button' class='btn btn-secondary btn-xs roomJoins'>Join</button>` : ""}
      ${localUsername === room.username ?
      `<button id='destroy${room.roomName}' style='margin-left: auto' type='button' class='btn btn-secondary btn-xs roomJoins'>Delete</button>` : ""}
    </div>`;
    });
    roomers.html(roomList);
      $("[id^=join]").click((e)=>{
        room = e.target.id.substring(4)
        socket.emit("joinRoom", {roomToJoin: room, user: localUsername})
      })
      $("[id^=destroy]").click((e)=>{
        room = e.target.id.substring(7)
        socket.emit("deleteRoom", {roomOwner: room, roomToDelete: room})
      })
      
  });


  socket.on("removeUser", (user) => {
    $(`#${user.name}`).remove();
  });

  socket.on("removeRoom", (room) => {
    $(`#room${room.roomId}`).remove()
  })

  socket.on("whoAmI", (data) => {
    console.log(data.name);
    $(`#name${data.name}`).append(" (me)");
  });
  
});
