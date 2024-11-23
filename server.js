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

  // เมื่อผู้ใช้สร้างห้อง
  socket.on('create room', ({ roomName, playerName }) => {
    if (!rooms[roomName]) {
      rooms[roomName] = { players: [], messages: [] };
    }
    rooms[roomName].players.push({ id: socket.id, name: playerName });
    socket.join(roomName);

    io.to(roomName).emit('room updated', {
      players: rooms[roomName].players,
      messages: rooms[roomName].messages,
    });
  });

  // เมื่อมีผู้ใช้ส่งข้อความแชท
  socket.on('chat message', ({ roomName, playerName, message }) => {
    const chatMessage = { playerName, message };
    rooms[roomName].messages.push(chatMessage);
    io.to(roomName).emit('chat message', chatMessage);
  });

  // เมื่อผู้ใช้ตัดการเชื่อมต่อ
  socket.on('disconnect', () => {
    for (const roomName in rooms) {
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
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
