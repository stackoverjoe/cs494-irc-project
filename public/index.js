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
  let currentRoom;

  let userList;
  let roomList;
  let onlineUsers = $("#userList");
  let messageBox = $("#messageBox");
  let userButton = $("#onlineUsers");
  let roomsButton = $("#rooms");
  let rooms = $("#roomList");
  let selectedRoom = $("#roomName");

  socket.on("newUserInit", (data) => {
    selectedRoom.text(`Room Id: ${data.sid} (Your room)`);
    localUsername = data.name;
  });

  userButton.click((click) => {
    rooms.css("display", "none");
    onlineUsers.css("display", "");
  });

  roomsButton.click((click) => {
    onlineUsers.css("display", "none");
    rooms.css("display", "");
  });

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
      return `<div id=${room.sid} style="display: flex; justify-content: start;" class="container">
      <!-- <img src="/w3images/bandmember.jpg" alt="Avatar" /> -->
      <div style="align-items: center">${room.sid}</div>
    </div>`;
    });
    rooms.html(roomList);
  });

  socket.on("removeUser", (user) => {
    $(`#${user.name}`).remove();
  });

  socket.on("whoAmI", (data) => {
    console.log(data.name);
    $(`#name${data.name}`).append(" (me)");
  });
});
