const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// เก็บข้อมูลห้อง
let rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // สร้างห้อง
  socket.on('create room', ({ roomName, game, maxPlayers }) => {
    if (rooms[roomName]) {
      socket.emit('error', { message: 'ห้องนี้มีอยู่แล้ว' });
    } else {
      rooms[roomName] = {
        game,
        maxPlayers,
        players: [{ id: socket.id, name: 'เจ้าของห้อง' }],
        messages: [],
      };
      socket.join(roomName);
      io.emit('rooms updated', { rooms: Object.keys(rooms) });
    }
  });

  // ดึงรายชื่อห้องทั้งหมด
  socket.on('get rooms', () => {
    socket.emit('rooms list', { rooms: Object.keys(rooms) });
  });

  // ขอเข้าร่วมห้อง
  socket.on('request join', ({ roomName, playerName }) => {
    if (rooms[roomName]) {
      const room = rooms[roomName];
      if (!room.players.some((player) => player.id === socket.id)) {
        room.players.push({ id: socket.id, name: playerName });
        socket.join(roomName);
        io.to(roomName).emit('room updated', {
          players: room.players,
          messages: room.messages,
        });
      }
    } else {
      socket.emit('error', { message: 'ห้องนี้ไม่มีอยู่ในระบบ' });
    }
  });

  // ส่งข้อความในแชท
  socket.on('chat message', ({ roomName, playerName, message }) => {
    if (rooms[roomName]) {
      const chatMessage = { playerName, message };
      rooms[roomName].messages.push(chatMessage);
      io.to(roomName).emit('chat message', chatMessage);
    }
  });

  // เริ่มเกม
  socket.on('start game', ({ roomName }) => {
    if (rooms[roomName]) {
      io.to(roomName).emit('game started', { game: rooms[roomName].game });
    }
  });

  // จัดการเมื่อผู้ใช้ตัดการเชื่อมต่อ
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    Object.keys(rooms).forEach((roomName) => {
      const room = rooms[roomName];
      room.players = room.players.filter((player) => player.id !== socket.id);
      if (room.players.length === 0) {
        delete rooms[roomName];
      } else {
        io.to(roomName).emit('room updated', {
          players: room.players,
          messages: room.messages,
        });
      }
    });
    io.emit('rooms updated', { rooms: Object.keys(rooms) });
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
