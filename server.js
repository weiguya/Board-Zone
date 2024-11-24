const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// เสิร์ฟไฟล์ static เช่น HTML, CSS, JavaScript
app.use(express.static(path.join(__dirname, 'public')));

// เก็บข้อมูลห้อง
let rooms = {};

// จัดการการเชื่อมต่อของ Socket.IO
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // เมื่อผู้ใช้สร้างห้อง
  socket.on('create room', ({ roomName, playerName, game, maxPlayers }) => {
    if (!rooms[roomName]) {
      rooms[roomName] = {
        game,
        maxPlayers,
        players: [{ id: socket.id, name: playerName, ready: false }], // เพิ่มสถานะ ready
        messages: [],
      };
      socket.join(roomName);
      console.log(`Room created: ${roomName}, Game: ${game}, Max Players: ${maxPlayers}`);
      io.emit('rooms updated', { rooms: Object.keys(rooms) });
    } else {
      socket.emit('error', { message: 'Room already exists!' });
    }
  });

  // เมื่อผู้ใช้ส่งข้อความในแชท
  socket.on('chat message', ({ roomName, playerName, message }) => {
    if (rooms[roomName]) {
      const chatMessage = { playerName, message };
      rooms[roomName].messages.push(chatMessage);
      io.to(roomName).emit('chat message', chatMessage); // ส่งข้อความไปยังทุกคนในห้อง
      console.log(`Message in room ${roomName}: ${playerName} - ${message}`);
    } else {
      socket.emit('error', { message: 'Room does not exist!' });
    }
  });

  // เมื่อผู้ใช้เข้าร่วมห้อง
  socket.on('join room', ({ roomName, playerName }) => {
    if (rooms[roomName]) {
      const room = rooms[roomName];
      if (!room.players.some((player) => player.id === socket.id)) {
        room.players.push({ id: socket.id, name: playerName, ready: false });
        socket.join(roomName);

        io.to(roomName).emit('room updated', {
          players: room.players,
          messages: room.messages,
        });
        console.log(`${playerName} joined room: ${roomName}`);
      }
    } else {
      socket.emit('error', { message: 'Room does not exist!' });
    }
  });

  // เมื่อผู้เล่นกดปุ่ม "Ready"
  socket.on('toggle ready', ({ roomName }) => {
    const room = rooms[roomName];
    if (room) {
      const player = room.players.find((p) => p.id === socket.id);
      if (player) {
        player.ready = !player.ready; // สลับสถานะ ready
        io.to(roomName).emit('room updated', {
          players: room.players,
          messages: room.messages,
        });
        console.log(`Player ${player.name} is ${player.ready ? 'ready' : 'not ready'}`);
      }
    }
  });

  // เมื่อเจ้าของห้องกดปุ่ม "Start Game"
  socket.on('start game', ({ roomName }) => {
    const room = rooms[roomName];
    if (room) {
      const allReady = room.players.every((player) => player.ready);
      if (allReady) {
        io.to(roomName).emit('game started', { game: room.game });
        console.log(`Game started in room: ${roomName}`);
      } else {
        socket.emit('error', { message: 'Not all players are ready!' });
      }
    }
  });

  // เมื่อผู้ใช้ตัดการเชื่อมต่อ
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const roomName in rooms) {
      const room = rooms[roomName];
      room.players = room.players.filter((player) => player.id !== socket.id);

      if (room.players.length === 0) {
        delete rooms[roomName];
        console.log(`Room deleted: ${roomName}`);
      } else {
        io.to(roomName).emit('room updated', {
          players: room.players,
          messages: room.messages,
        });
      }
    }
    io.emit('rooms updated', { rooms: Object.keys(rooms) });
  });
});

// เริ่มเซิร์ฟเวอร์
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
