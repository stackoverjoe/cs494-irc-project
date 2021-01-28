$(document).ready(function () {
  var socket = io.connect("http://localhost:4000", {
    reconnection: false,
    forcedNewConnection: false,
  });
  socket.on('connect', () => {`Connected as ${console.log(socket.id)}`});


});
