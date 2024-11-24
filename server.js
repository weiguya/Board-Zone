const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 10000; // ใช้พอร์ต 10000

// เสิร์ฟ Static Files
app.use(express.static(path.join(__dirname, 'public')));

// เก็บข้อมูลห้อง
let rooms = {};

// ตั้งค่า Socket.IO
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // สร้างห้อง
  socket.on('create room', ({ roomName, playerName }) => {
    if (!rooms[roomName]) {
      rooms[roomName] = {
        players: [{ id: socket.id, name: playerName }],
        messages: [],
      };
      socket.join(roomName);
      console.log(`Room created: ${roomName}`);
      io.emit('rooms updated', { rooms: Object.keys(rooms) });
    } else {
      socket.emit('error', { message: 'Room already exists!' });
    }
  });

  // ส่งข้อความแชท
  socket.on('chat message', ({ roomName, playerName, message }) => {
    if (rooms[roomName]) {
      const chatMessage = { playerName, message };
      rooms[roomName].messages.push(chatMessage);
      io.to(roomName).emit('chat message', chatMessage);
    } else {
      socket.emit('error', { message: 'Room does not exist!' });
    }
  });

  // เข้าร่วมห้อง
  socket.on('join room', ({ roomName, playerName }) => {
    if (rooms[roomName]) {
      rooms[roomName].players.push({ id: socket.id, name: playerName });
      socket.join(roomName);
      io.to(roomName).emit('room updated', {
        players: rooms[roomName].players,
        messages: rooms[roomName].messages,
      });
    } else {
      socket.emit('error', { message: 'Room does not exist!' });
    }
  });

  // ตัดการเชื่อมต่อ
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const roomName in rooms) {
      rooms[roomName].players = rooms[roomName].players.filter(
        (player) => player.id !== socket.id
      );

      if (rooms[roomName].players.length === 0) {
        delete rooms[roomName];
      } else {
        io.to(roomName).emit('room updated', {
          players: rooms[roomName].players,
          messages: rooms[roomName].messages,
        });
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
