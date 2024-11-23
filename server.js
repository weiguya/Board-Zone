const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ใช้พอร์ตจาก Environment Variables หรือพอร์ต 3000 เป็นค่าเริ่มต้น
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
  console.log('A user connected:', socket.id);

  // เมื่อผู้ใช้สร้างห้อง
  socket.on('create room', ({ roomName, maxPlayers }) => {
    rooms[roomName] = {
      host: socket.id,
      players: [socket.id],
      maxPlayers,
      pendingRequests: [],
    };
    socket.join(roomName);
    io.emit('rooms updated', rooms); // แจ้งทุกคนว่ามีห้องใหม่
    console.log('Room created:', rooms);
  });

  // เมื่อผู้ใช้ขอเข้าร่วมห้อง
  socket.on('request join', ({ roomName }) => {
    if (rooms[roomName]) {
      rooms[roomName].pendingRequests.push(socket.id);
      io.to(rooms[roomName].host).emit('join requests', {
        roomName,
        requests: rooms[roomName].pendingRequests,
      });
    }
  });

  // เจ้าของห้องอนุมัติหรือปฏิเสธคำขอ
  socket.on('respond to request', ({ roomName, playerId, accept }) => {
    if (rooms[roomName]) {
      rooms[roomName].pendingRequests = rooms[roomName].pendingRequests.filter(
        (id) => id !== playerId
      );
      if (accept) {
        rooms[roomName].players.push(playerId);
        io.to(playerId).emit('join approved', { roomName });
      } else {
        io.to(playerId).emit('join denied');
      }
      io.to(rooms[roomName].host).emit('join requests', {
        roomName,
        requests: rooms[roomName].pendingRequests,
      });
    }
  });

  // เมื่อผู้ใช้ตัดการเชื่อมต่อ
  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    // ลบผู้ใช้ออกจากห้องที่เกี่ยวข้อง
    Object.keys(rooms).forEach((roomName) => {
      const room = rooms[roomName];
      room.players = room.players.filter((id) => id !== socket.id);
      if (room.host === socket.id) {
        delete rooms[roomName];
      }
    });
    io.emit('rooms updated', rooms);
  });
});

// เริ่มเซิร์ฟเวอร์
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
