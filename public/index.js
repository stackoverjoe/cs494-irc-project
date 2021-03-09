$(document).ready(function () {
  //Keep track of rooms client is a part of for UI
  let myRooms = [];
  //Connect to server  
  var socket = io.connect("http://localhost:4000", {
    reconnection: false,
    forcedNewConnection: false,
  });
  socket.on("connect", () => {
    `Connected as ${console.log(socket.id)}`;
  });

  //Store local variables
  let localUsername;
  let currentRoomInFocus = null;
  let hasLearned = false;

  //Array of user recevied from server
  let userList;
  //Array of rooms received from server
  let roomList;

  //Get dom elements for UI manipulation via jquery
  let onlineUsers = $("#userList");
  let messageBox = $("#messageBox");
  let userButton = $("#onlineUsers");
  let roomsButton = $("#rooms");
  let roomsOnline = $("#roomList");
  let roomNames = $("#tabRoomNames");
  let roomers = $("#theRooms");
  let createRoom = $("#createRoomButton");
  let mainChatWindow = $("#chatBox");
  let forceDisconnect = $("#forceDisconnect")

  //Enable tooltips
  $(function () {
    $('[data-toggle="tooltip"]').tooltip();
  });

  //Allow the user to disconnect from the server
  forceDisconnect.click(()=>{
    socket.disconnect()
    alert("You have been disconnected from the server. If you would like to reconnect, navigate to the url again or refresh your page.")
  })

  //Handle a room being clicked on. This is how the ui will display messages
  //from a particular room while hiding the ones we do not care about from others
  roomNames.click((e) => {
    let roomToFocus = e.target.id.substring(3);
    currentRoomInFocus = roomToFocus;
    roomNames.children("span").each((idx, item) => {
      let currentItem = item.id.substring(3);
      if (currentItem !== roomToFocus) {
        $(`#tab${currentItem}`).css("background-color", "");
        $(`#chatWindow${currentItem}`).css("display", "none");
      } else {
        $(`#tab${currentItem}`).css("background", "lightgray");
        $(`#chatWindow${currentItem}`).css("display", "");
      }
    });
  });

  //This is sent as an acknowledgment that the server has connected
  //it contains the username assigned that we will store locally
  //for easy reference
  socket.on("newUserInit", (data) => {
    localUsername = data.name;
  });

  //Left hand side of the ui, are we displaying the users or the rooms?
  //The users
  userButton.click(() => {
    roomsOnline.css("display", "none");
    onlineUsers.css("display", "");
    $("#rooms").css("background", "");
    $("#onlineUsers").css("background", "lightgray");
  });

  //The rooms
  roomsButton.click(() => {
    onlineUsers.css("display", "none");
    roomsOnline.css("display", "");
    $("#onlineUsers").css("background", "");
    $("#rooms").css("background", "lightgray");
  });

  //Handle the creation of a room
  createRoom.click(() => {
    //enfore alphanumeric room naming policy
    //The ui utilizes this information as an id in the dom so it has constraints
    let re = /^[A-Za-z\d]*$/;
    let roomName = $("#roomToCreate").val();
    if (!re.test(roomName)) {
      alert(
        "Room names must consist of only letters and numbers with no spaces."
      );
      return;
    }
    //Inform the server we would like to create a room
    socket.emit("createRoom", {
      sid: socket.id,
      roomName: roomName,
      name: localUsername,
    });
    $("#createRoomModal").modal("hide");
    $("#createRoom").prop("disabled", true);
    currentRoomInFocus = roomName;
    //This is not ideal and the server should send the ok for this.
    //But we assume the room will be created for UI ease sake
    roomNames.append(
      `<span id=tab${roomName} style="padding-right: 5px; margin-right: 5px; border-right: 1px solid black; cursor: pointer; border-top-left-radius: 5px; border-bottom-left-radius: 5px">${roomName} (Your room)</span>`
    );
    //Append that window to the DOM, hidden by default
    mainChatWindow.append(
      `<div id=chatWindow${roomName} style="display: none;">Beginning of time for ${roomName}</div>`
    );
    $("#roomToCreate").val("");
    //Tooltip to instruct user how to send messages to room
    if (!hasLearned) {
      $("#roomName").tooltip("show");
      hasLearned = true;
    }
    //Close the tooltip after 3 seconds
    let timeout = setTimeout(() => {
      $("#roomName").tooltip("hide");
      clearTimeout(timeout);
    }, 3000);
  });

  //Either a room has been joined or left, check what and dispatch accordingly
  socket.on("joinedRoomStatus", (data) => {
    if (data.status === "joined") {
      $(`#join${data.roomJoined}`).replaceWith(
        `<button id='leave${data.roomJoined}' style='margin-left: 3px' type='button' class='btn btn-danger btn-xs roomJoins'>Leave</button>`
      );
      $(`#leave${data.roomJoined}`).click((e) => {
        roomleft = e.target.id.substring(5);
        socket.emit("leaveRoom", {
          username: localUsername,
          roomToLeave: data.roomJoined,
        });
      });
      roomNames.append(
        `<span id=tab${data.roomJoined} style="padding-right: 5px; margin-right: 5px; border-right: 1px solid black; cursor: pointer; border-top-left-radius: 5px; border-bottom-left-radius: 5px">${data.roomJoined}</span>`
      );
      mainChatWindow.append(
        `<div id=chatWindow${data.roomJoined} style="display: none;">Beginning of time for ${data.roomJoined}</div>`
      );
      if (!hasLearned) {
        $("#roomName").tooltip("show");
        hasLearned = true;
      }
      let timeout = setTimeout(() => {
        $("#roomName").tooltip("hide");
        clearTimeout(timeout);
      }, 3000);
    } else if (data.status === "left") {
      myRooms = myRooms.filter((room) => room != data.roomLeft);
      $(`#leave${data.roomLeft}`).replaceWith(
        `<button id='join${data.roomLeft}' style='margin-left: 3px' type='button' class='btn btn-secondary btn-xs roomJoins'>Join</button>`
      );
      $(`#join${data.roomLeft}`).click((e) => {
        roomleft = e.target.id.substring(4);
        socket.emit("joinRoom", {
          username: localUsername,
          roomToJoin: data.roomLeft,
        });
      });
      $(`#chatWindow${data.roomLeft}`).remove();
      $(`#tab${data.roomLeft}`).remove();
    }
  });

  //Monitor the user message activity and listen for enter key being pressed
  messageBox.keydown((key) => {
    if (key.keyCode === 13) {
      if (!currentRoomInFocus) {
        alert("Please select a room to chat with.");
      }
      let chatText = messageBox.val().trim();
      if (!chatText) {
        return;
      }
      key.preventDefault();
      socket.emit("sendMessage", {
        from: localUsername,
        message: chatText,
        roomToMessage: currentRoomInFocus,
      });
      messageBox.val("");
    }
  });

  //Update the users being displayed in the ui via array sent from server
  socket.on("updateUser", (user) => {
    userList = user.users.map((online) => {
      return `<div id=${
        online.username
      } style="display: flex; justify-content: start;" class="container">
        <!-- <img src="/w3images/bandmember.jpg" alt="Avatar" /> -->
        <div id="name${online.username}" styler="align-items: center">${
        online.username
      }</div>
      <div style="display: flex; margin-left: auto; align-items: center">
      ${
        localUsername === online.username
          ? " (me)"
          : `<i id=privateX${online.sid} class='fas fa-location-arrow style='color: darkgray; font-size: 30px;'><div id=${online.username} style="display: none;"></div></i>`
      }</div>`;
    });
    onlineUsers.html(userList);
    $("[id^=privateX]").click((e) => {
      let toName = e.target.querySelector("div").id;
      let sendTo = e.target.id.substring(8);
      $("#privateMessageTo").text(`To: ${toName}`);
      $("#stagingDest").text(sendTo);
      $("#privateMessageModal").modal("show");
    });
  });

  //Send a specific user a message via pop up dialouge 
  $("#sendPrivateMessage").click(() => {
    let message = $("#privateMessageContent").val();
    let sendTo = $("#stagingDest").text();
    $("#privateMessageContent").val("");
    $("#privateMessageModal").modal("hide");
    socket.emit("privateMessage", {
      from: localUsername,
      to: sendTo,
      message: message,
    });
  });

  //Private messages are displayed as temporary toasts
  //Every 5 seconds we want to clean them up so we do not get an infinite list of them
  let cleaner = null;
  socket.on("privateMessage", (data) => {
    $("#theToasts").prepend(`
    <div class="toast" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="toast-header">
        <strong class="mr-auto">Message from ${data.from}</strong>
        <small class="text-muted">just now</small>
        <button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="toast-body">
        ${data.message}
      </div>
  </div>
    `);
    $(".toast").toast({
      delay: 5000,
    });

    //Set toast shelf life to 10 seconds.
    if (!cleaner) {
      cleaner = setTimeout(() => {
        $("#theToasts").html("");
        clearTimeout(cleaner);
        cleaner = null;
      }, 10000);
    }

    $(".toast").toast("show");
  });

  //Similar to users, we update the UI state of the online rooms
  socket.on("updateRooms", (rooms) => {
    roomList = rooms.all.map((room) => {
      return `<div id=room${
        room.sid
      } style="display: flex; justify-content: start; align-items: center" class="container">
      <!-- <img src="/w3images/bandmember.jpg" alt="Avatar" /> -->
      <div style="align-items: center;">${room.roomName} - ${
        localUsername === room.username
          ? "(your room)"
          : `Host: ${room.username}`
      }</div>
      <button id="members${
        room.roomName
      }" style="margin-left: auto" class="btn btn-outline-secondary">Members</button>
      ${
        localUsername !== room.username && !myRooms.includes(room.roomName)
          ? `<button id='join${room.roomName}' style='margin-left: 3px' type='button' class='btn btn-secondary btn-xs roomJoins'>Join</button>`
          : ""
      }
      ${
        localUsername !== room.username && myRooms.includes(room.roomName)
          ? `<button id='leave${room.roomName}' style='margin-left: 3px' type='button' class='btn btn-danger btn-xs roomJoins'>Leave</button>`
          : ""
      }
       ${
         localUsername === room.username
           ? `<button id='destroy${room.roomName}' style='margin-left: 3px' type='button' class='btn btn-secondary btn-xs roomJoins'>Delete</button>`
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
      $(`#chatWindow${room}`).remove();
      $(`#tab${room}`).remove();
      socket.emit("deleteRoom", { roomOwner: room, roomToDelete: room });
      $("#createRoom").prop("disabled", false);
    });
    $(`[id^=leave]`).click((e) => {
      roomleft = e.target.id.substring(5);
      myRooms = myRooms.filter((leave) => leave !== roomleft);
      socket.emit("leaveRoom", {
        roomToLeave: roomleft,
      });
    });
    $(`[id^=members]`).click((e) => {
      roomId = e.target.id.substring(7);
      socket.emit("getMembers", {
        room: roomId,
      });
    });
  });

  socket.on("removeUser", (user) => {
    $(`#${user.name}`).remove();
  });

  socket.on("removeRoom", (room) => {
    if (currentRoomInFocus === room.roomName) {
      currentRoomInFocus = null;
    }
    $(`#room${room.roomId}`).remove();
    if (room.roomName) {
      $(`#tab${room.roomName}`).remove();
      $(`#chatWindow${room.roomName}`).remove();
    }
  });

  socket.on("requestMemberResponse", (data) => {
    if (!data.members) {
      return;
    }
    let memberList = data.members.map((mem) => {
      return `
      <div id=member${
        mem.username
      } style="display: flex; justify-content: start; align-items: center" class="container">
      <!-- <img src="/w3images/bandmember.jpg" alt="Avatar" /> -->
      <div style="align-items: center;">${mem.username}</div> 
      ${
        socket.id !== mem.id
          ? `<i
            class="fas fa-location-arrow"
            id="privateMessage${mem.id}"
            style="
              color: darkgrey;
              font-size: 20px;
              margin-left: auto;
            "
          ></i>`
          : "<span style='margin-left: auto'>You</span>"
      }
      `;
    });
    $(`#memberModalTitle`).text(`Room: ${data.room}`);
    $(`#memberModalBody`).html(memberList);
    $("#membersModal").modal("show");
  });

  //We focus on the room being messages and append it's html,
  //Whether it is currently being viewed or not we don't know/care
  socket.on("roomMessage", (data) => {
    let chatWindowToUpdate = $(`#chatWindow${data.roomToMessage}`);
    if (data.sid === socket.id) {
      chatWindowToUpdate.append(`        
          <div class="container">
            <img src="http://placekitten.com/200/300" alt="Avatar" />
            <p>${data.from}: ${data.message}</p>
            <span class="time-right">${data.time}</span>
          </div>
        `);
    } else {
      chatWindowToUpdate.append(`
          <div class="container darker">
            <img src="http://placekitten.com/200/300" alt="Avatar" class="right" />
            <p>${data.from}: ${data.message}</p>
            <span class="time-left">${data.time}</span>
          </div>
      `);
    }
    $(`#chatBox`).scrollTop($(`#chatBox`)[0].scrollHeight);
  });
});
