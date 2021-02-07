$(document).ready(function () {
  
  let friendlyRoomName = new Map();
  let myRooms = [];
  var socket = io.connect("http://localhost:4000", {
    reconnection: false,
    forcedNewConnection: false,
  });
  socket.on("connect", () => {
    `Connected as ${console.log(socket.id)}`;
  });

  let localUsername;
  let createdRoom = false;
  let currentRoomInFocus = null;

  let userList;
  let roomList;
  let onlineUsers = $("#userList");
  let messageBox = $("#messageBox");
  let userButton = $("#onlineUsers");
  let roomsButton = $("#rooms");
  let roomsOnline = $("#roomList");
  let roomNames = $("#tabRoomNames");
  let roomers = $("#theRooms");
  let createRoom = $("#createRoomButton");
  let mainChatWindow = $("#chatBox")

  function changeChatTab(){
    roomNames.children('span').each(el => {
      let roomToFocus = el.target.id.substring(3)
      console.log(roomToFocus)
    })
  }

  roomNames.click(e => {
    let roomToFocus = e.target.id.substring(3)
    currentRoomInFocus = roomToFocus
    roomNames.children('span').each((idx,item) =>{
      let currentItem = item.id.substring(3)
      if(currentItem !== roomToFocus){
        $(`#tab${currentItem}`).css("background-color", "")
        $(`#chatWindow${currentItem}`).css("display", "none")
      }
      else {
        $(`#tab${currentItem}`).css("background", "lightgray")
        $(`#chatWindow${currentItem}`).css("display", "")
      }
    })
  })

  socket.on("newUserInit", (data) => {
    // selectedRoom.text(`Create or join a room to get chatting tehehe`);
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
    let roomName = $("#roomToCreate").val();
    socket.emit("createRoom", {
      sid: socket.id,
      roomName: roomName,
      name: localUsername,
    });
    console.log(roomName);
    $("#createRoomModal").modal("hide");

    currentRoomInFocus = roomName
    //This is not good and the server should send the ok for this.. gotta zoom also 
    roomNames.append(`<span id=tab${roomName} style="padding-right: 5px; margin-right: 5px; border-right: 1px solid black; cursor: pointer">${roomName} (My room)</span>`)
    mainChatWindow.append(`<div id=chatWindow${roomName} style="display: none;">Beginning of time for ${roomName}</div>`)
  });

  socket.on("joinedRoomStatus", (data) => {
    if (data.status === "joined") {
      $(`#join${data.roomJoined}`).replaceWith(
        `<button id='leave${data.roomJoined}' style='margin-left: auto' type='button' class='btn btn-danger btn-xs roomJoins'>Leave</button>`
      );
      $(`#leave${data.roomJoined}`).click((e) => {
        roomleft = e.target.id.substring(5);
        console.log(roomleft);
        socket.emit("leaveRoom", {
          username: localUsername,
          roomToLeave: data.roomJoined
        });
      });
      roomNames.append(`<span id=tab${data.roomJoined} style="padding-right: 5px; margin-right: 5px; border-right: 1px solid black; cursor: pointer">${data.roomJoined}</span>`)
      mainChatWindow.append(`<div id=chatWindow${data.roomJoined} style="display: none;">Beginning of time for ${data.roomJoined}</div>`)
    } else if (data.status === "left") {
        myRooms = myRooms.filter(room => room != data.roomLeft)
        $(`#leave${data.roomLeft}`).replaceWith(`<button id='join${data.roomLeft}' style='margin-left: auto' type='button' class='btn btn-secondary btn-xs roomJoins'>Join</button>`)
        $(`#join${data.roomLeft}`).click((e) => {
          roomleft = e.target.id.substring(4);
          console.log(roomleft);
          socket.emit("joinRoom", {
            username: localUsername,
            roomToJoin: data.roomLeft
          });
        });
        $(`#chatWindow${data.roomLeft}`).remove()
        $(`#tab${data.roomLeft}`).remove()
    }
  });

  messageBox.keydown((key) => {
    if (key.keyCode === 13) {
      if(!currentRoomInFocus){
        alert("Please select a room to chat with.")
      }
      let chatText = messageBox.val();
      key.preventDefault();
      socket.emit("sendMessage", {
        from: localUsername,
        message: chatText,
        roomToMessage: currentRoomInFocus
      });
      messageBox.val("");
    }
  });

  socket.on("updateUser", (user) => {
    userList = user.users.map((online) => {
      return `<div id=${
        online.username
      } style="display: flex; justify-content: start;" class="container">
        <!-- <img src="/w3images/bandmember.jpg" alt="Avatar" /> -->
        <div id="name${online.username}" styler="align-items: center">${
        online.username
      }${localUsername === online.username ? " (me)" : ""}</div>
      </div>`;
    });
    onlineUsers.html(userList);
  });

  socket.on("updateRooms", (rooms) => {
    roomList = rooms.all.map((room) => {
      return `<div id=room${
        room.sid
      } style="display: flex; justify-content: start; align-items: center" class="container">
      <!-- <img src="/w3images/bandmember.jpg" alt="Avatar" /> -->
      <div style="align-items: center">${room.roomName} - ${
        localUsername === room.username
          ? "(your room)"
          : `Host: ${room.username}`
      }</div>
      ${
        localUsername !== room.username && !myRooms.includes(room.roomName)
          ? `<button id='join${room.roomName}' style='margin-left: auto' type='button' class='btn btn-secondary btn-xs roomJoins'>Join</button>`
          : ""
      }
      ${
        localUsername !== room.username && myRooms.includes(room.roomName)
          ? `<button id='leave${room.roomName}' style='margin-left: auto' type='button' class='btn btn-danger btn-xs roomJoins'>Leave</button>`
          : ""
      }
       ${
         localUsername === room.username
           ? `<button id='destroy${room.roomName}' style='margin-left: auto' type='button' class='btn btn-secondary btn-xs roomJoins'>Delete</button>`
           : ""
       }
    </div>`;
    });
    roomers.html(roomList);
    $("[id^=join]").click((e) => {
      room = e.target.id.substring(4);
      myRooms.push(room);
      socket.emit("joinRoom", { roomToJoin: room, user: localUsername });
    });
    $("[id^=destroy]").click((e) => {
      room = e.target.id.substring(7);
      $(`#chatWindow${room}`).remove()
      $(`#tab${room}`).remove()
      socket.emit("deleteRoom", { roomOwner: room, roomToDelete: room });
    });
    $(`[id^=leave2]`).click((e) => {
      roomleft = e.target.id.substring(6);
      myRooms = myRooms.filter(leave => leave !== roomleft)
      socket.emit("leaveRoom", {
        roomToLeave: roomleft,
      });
    });
  });

  socket.on("removeUser", (user) => {
    $(`#${user.name}`).remove();
  });

  socket.on("removeRoom", (room) => {
    $(`#room${room.roomId}`).remove();
  });

  socket.on("whoAmI", (data) => {
    console.log(data.name);
    $(`#name${data.name}`).append(" (me)");
  });

  socket.on("roomMessage", data => {
    let chatWindowToUpdate = $(`#chatWindow${data.roomToMessage}`)
    if(data.sid === socket.id){
        chatWindowToUpdate.append(`        
          <div class="container">
            <img src="http://placekitten.com/200/300" alt="Avatar" />
            <p>${data.from}: ${data.message}</p>
            <span class="time-right">11:00</span>
          </div>
        `)
    } else {
      chatWindowToUpdate.append(`
          <div class="container darker">
            <img src="http://placekitten.com/200/300" alt="Avatar" class="right" />
            <p>${data.from}: ${data.message}</p>
            <span class="time-left">11:01</span>
          </div>
      `)
    }
    //chatWindowToUpdate.animate({ scrollTop: chatWindowToUpdate.prop("scrollHeight")}, 1000);
    $(`#chatBox`).scrollTop($(`#chatBox`)[0].scrollHeight);

    console.log(data.message)
  })
});
