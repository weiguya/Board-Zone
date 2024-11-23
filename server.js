const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// เก็บข้อมูลห้อง
let rooms = {};

io.on('connection', (socket) => {
  console.log('A user connected');

  // เมื่อผู้ใช้สร้างห้อง
  socket.on('create room', (data) => {
    const { roomName, maxPlayers } = data;
    rooms[roomName] = {
      host: socket.id,
      players: [socket.id],
      maxPlayers: maxPlayers,
      pendingRequests: [],
    };
    socket.join(roomName);
    io.emit('rooms updated', rooms); // แจ้งทุกคนว่ามีห้องใหม่
  });

  // เมื่อผู้ใช้ขอเข้าร่วมห้อง
  socket.on('request join', (data) => {
    const { roomName } = data;
    if (rooms[roomName]) {
      rooms[roomName].pendingRequests.push(socket.id);
      io.to(rooms[roomName].host).emit('join requests', {
        roomName,
        requests: rooms[roomName].pendingRequests,
      });
    }
  });

  // เจ้าของห้องอนุมัติหรือปฏิเสธ
  socket.on('respond to request', (data) => {
    const { roomName, playerId, accept } = data;
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
    console.log('A user disconnected');
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

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
