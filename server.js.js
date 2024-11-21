const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ตั้งค่า static files
app.use(express.static(path.join(__dirname, 'public')));

// การตั้งค่า Socket.IO
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('chat message', (data) => {
    console.log('Message from ' + data.username + ": " + data.message);
    io.emit('chat message', data);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// เริ่มเซิร์ฟเวอร์
server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
