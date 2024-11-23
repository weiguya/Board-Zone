const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ใช้พอร์ตจาก Render หรือ Local
const PORT = process.env.PORT || 3000;

// เสิร์ฟไฟล์ static จากโฟลเดอร์ public
app.use(express.static(path.join(__dirname, 'public')));

// Route สำหรับหน้าแรก
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// เก็บข้อมูลห้อง
let rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // เมื่อผู้ใช้สร้างห้อง
  socket.on('create room', ({ roomName }) => {
    if (rooms[roomName]) {
      socket.emit('error', { message: 'ห้องนี้มีอยู่แล้ว' });
    } else {
      rooms[roomName] = { creator: socket.id };
      io.emit('rooms updated', rooms); // ส่งข้อมูลห้องไปยังทุกคน
      console.log('Room created:', roomName, 'by', socket.id);
    }
  });

  // เมื่อผู้ใช้ขอข้อมูลห้อง
  socket.on('get rooms', () => {
    socket.emit('rooms updated', rooms); // ส่งรายการห้องให้ผู้ใช้
  });

  // เมื่อผู้ใช้ตัดการเชื่อมต่อ
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // ลบห้องที่ผู้ใช้เป็นเจ้าของ
    Object.keys(rooms).forEach((roomName) => {
      if (rooms[roomName].creator === socket.id) {
        delete rooms[roomName];
        console.log('Room deleted:', roomName);
      }
    });

    // อัปเดตข้อมูลห้องสำหรับผู้ใช้อื่น
    io.emit('rooms updated', rooms);
  });
});

// เริ่มเซิร์ฟเวอร์
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
