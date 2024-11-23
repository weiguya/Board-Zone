const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ใช้พอร์ตจาก Render หรือ 3000 เป็นค่าเริ่มต้น
const PORT = process.env.PORT || 3000;

// ให้ Express ใช้โฟลเดอร์ public สำหรับ static files
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
  socket.on('create room', ({ roomName, maxPlayers }) => {
    rooms[roomName] = {
      host: socket.id,
      players: [socket.id],
      maxPlayers,
    };
    socket.join(roomName);
    io.emit('rooms updated', rooms);
    console.log('Room created:', roomName);
  });

  // เมื่อผู้ใช้ตัดการเชื่อมต่อ
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    Object.keys(rooms).forEach((roomName) => {
      const room = rooms[roomName];
      if (room.host === socket.id) {
        delete rooms[roomName];
      } else {
        room.players = room.players.filter((id) => id !== socket.id);
      }
    });
    io.emit('rooms updated', rooms);
  });
});

// เริ่มเซิร์ฟเวอร์
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
