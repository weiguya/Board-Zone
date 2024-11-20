const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log('A user connected');

  // เมื่อส่งข้อความในห้องแชท
  socket.on('chat message', (data) => {
    console.log('Message from ' + data.username + ": " + data.message);  // Log the message in the server
    io.emit('chat message', data);  // ส่งข้อความไปให้ทุกคน (พร้อมชื่อและข้อความ)
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
