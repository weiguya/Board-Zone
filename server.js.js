const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// เสิร์ฟไฟล์ HTML
app.use(express.static(path.join(__dirname, 'public')));

// เมื่อเชื่อมต่อกับ Socket.IO
io.on('connection', (socket) => {
  console.log('A user connected');

  // รับข้อความจาก client
  socket.on('chat message', (data) => {
    console.log('Message from ' + data.username + ": " + data.message);  // ดูข้อความใน Console
    io.emit('chat message', data);  // ส่งข้อมูลไปทุกคน (ข้อความและชื่อผู้ส่ง)
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// เริ่มเซิร์ฟเวอร์
server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
