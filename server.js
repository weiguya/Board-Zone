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
socket.on('create room', ({ roomName, maxPlayers, game }) => {
  if (rooms[roomName]) {
    socket.emit('error', { message: 'ห้องนี้มีอยู่แล้ว' });
  } else {
    rooms[roomName] = {
      creator: socket.id,
      maxPlayers,
      game,
      players: [{ id: socket.id, name: 'เจ้าของห้อง' }],
      pendingRequests: [],
    };
    socket.join(roomName);
    console.log(`Room created: ${roomName}, Game: ${game}, Max Players: ${maxPlayers}`);
    io.emit('rooms updated', { rooms: Object.keys(rooms) }); // แจ้งว่ามีห้องใหม่
  }
});


  // เมื่อผู้ใช้ขอเข้าร่วมห้อง
  socket.on('request join', ({ roomName, playerName }) => {
    if (rooms[roomName]) {
      rooms[roomName].pendingRequests.push({ id: socket.id, name: playerName });
      io.to(rooms[roomName].creator).emit('join requests', {
        roomName,
        requests: rooms[roomName].pendingRequests,
      });
    } else {
      socket.emit('error', { message: 'ห้องนี้ไม่มีอยู่ในระบบ' });
    }
  });

  // เจ้าของห้องตอบคำขอเข้าร่วม
  socket.on('respond to request', ({ roomName, playerId, accept }) => {
    if (rooms[roomName]) {
      const requestIndex = rooms[roomName].pendingRequests.findIndex((req) => req.id === playerId);
      if (requestIndex > -1) {
        const player = rooms[roomName].pendingRequests.splice(requestIndex, 1)[0];
        if (accept) {
          rooms[roomName].players.push({ id: playerId, name: player.name });
          io.to(playerId).emit('join approved', { roomName });
        } else {
          io.to(playerId).emit('join denied');
        }
        io.to(rooms[roomName].creator).emit('join requests', {
          roomName,
          requests: rooms[roomName].pendingRequests,
        });
        io.to(roomName).emit('room updated', { players: rooms[roomName].players });
      }
    }
  });

  // เมื่อเริ่มเกม
  socket.on('start game', ({ roomName }) => {
    if (rooms[roomName]) {
      io.to(roomName).emit('game started', { game: rooms[roomName].game });
      console.log(`Game started in room: ${roomName}`);
    } else {
      socket.emit('error', { message: 'ห้องนี้ไม่มีอยู่ในระบบ' });
    }
  });

  // เมื่อผู้ใช้ส่งข้อความในแชท
  socket.on('chat message', ({ roomName, message }) => {
    if (rooms[roomName]) {
      io.to(roomName).emit('chat message', { message });
    } else {
      socket.emit('error', { message: 'ไม่สามารถส่งข้อความได้ ห้องนี้ไม่มีอยู่ในระบบ' });
    }
  });

  // เมื่อผู้ใช้ตัดการเชื่อมต่อ
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    Object.keys(rooms).forEach((roomName) => {
      const room = rooms[roomName];
      room.players = room.players.filter((player) => player.id !== socket.id);

      // หากเจ้าของห้องหลุด ลบห้องทั้งหมด
      if (room.creator === socket.id) {
        delete rooms[roomName];
        console.log(`Room deleted: ${roomName}`);
      }
    });

    // อัปเดตห้องหลังการเปลี่ยนแปลง
    io.emit('rooms updated', { rooms: Object.keys(rooms) });
  });
});

// เริ่มเซิร์ฟเวอร์
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
