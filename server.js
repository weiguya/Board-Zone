const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// เสิร์ฟไฟล์ static จากโฟลเดอร์ public
app.use(express.static(path.join(__dirname, 'public')));

// เก็บข้อมูลห้อง
let rooms = {};

// กำหนด Route สำหรับหน้าแรกและหน้าอื่นๆ
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/select-mode.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'select-mode.html')));
app.get('/create-room.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'create-room.html')));
app.get('/waiting-room.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'waiting-room.html')));

// Socket.IO ฟังก์ชันจัดการ
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // สร้างห้องใหม่
  socket.on('create room', ({ roomName, game, maxPlayers }) => {
    if (rooms[roomName]) {
      socket.emit('error', { message: 'Room already exists' });
    } else {
      rooms[roomName] = {
        game,
        maxPlayers,
        players: [{ id: socket.id, name: 'Host' }],
        messages: [],
      };
      socket.join(roomName);
      console.log(`Room created: ${roomName}`);
      io.emit('rooms updated', { rooms: Object.keys(rooms) });
    }
  });

  // ขอเข้าร่วมห้อง
  socket.on('request join', ({ roomName, playerName }) => {
    if (rooms[roomName]) {
      const room = rooms[roomName];
      if (!room.players.some((player) => player.id === socket.id)) {
        room.players.push({ id: socket.id, name: playerName });
        socket.join(roomName);
        console.log(`${playerName} joined room: ${roomName}`);
        io.to(roomName).emit('room updated', { players: room.players, messages: room.messages });
      }
    } else {
      socket.emit('error', { message: 'Room does not exist' });
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

  // จัดการการตัดการเชื่อมต่อ
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    Object.keys(rooms).forEach((roomName) => {
      const room = rooms[roomName];
      room.players = room.players.filter((player) => player.id !== socket.id);
      if (room.players.length === 0) {
        delete rooms[roomName];
        console.log(`Room deleted: ${roomName}`);
      } else {
        io.to(roomName).emit('room updated', { players: room.players, messages: room.messages });
      }
    });
    io.emit('rooms updated', { rooms: Object.keys(rooms) });
  });
});

// เริ่มเซิร์ฟเวอร์
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
