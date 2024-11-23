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

  // ตรวจสอบว่าเซิร์ฟเวอร์ได้รับชื่อผู้เล่นหรือยัง
  socket.on('set player name', ({ playerName }) => {
    if (playerName && playerName.trim()) {
      socket.data.playerName = playerName.trim(); // เก็บชื่อผู้เล่นไว้ใน data ของ socket
      console.log(`Player set name: ${playerName}`);
    } else {
      socket.emit('error', { message: 'Invalid player name' });
    }
  });

  // สร้างห้อง
  socket.on('create room', ({ roomName, game, maxPlayers }) => {
    if (!socket.data.playerName) {
      socket.emit('error', { message: 'You must set a player name first.' });
      return;
    }

    if (rooms[roomName]) {
      socket.emit('error', { message: 'Room already exists' });
    } else {
      rooms[roomName] = {
        game,
        maxPlayers,
        players: [{ id: socket.id, name: socket.data.playerName }],
        messages: [],
      };
      socket.join(roomName);
      console.log(`Room created: ${roomName} by ${socket.data.playerName}`);
      io.emit('rooms updated', { rooms: Object.keys(rooms) });
    }
  });

  // ดึงรายชื่อห้องทั้งหมด
  socket.on('get rooms', () => {
    socket.emit('rooms list', { rooms: Object.keys(rooms) });
  });

  // ขอเข้าร่วมห้อง
  socket.on('request join', ({ roomName }) => {
    if (!socket.data.playerName) {
      socket.emit('error', { message: 'You must set a player name first.' });
      return;
    }

    if (rooms[roomName]) {
      const room = rooms[roomName];
      if (!room.players.some((player) => player.id === socket.id)) {
        room.players.push({ id: socket.id, name: socket.data.playerName });
        socket.join(roomName);
        console.log(`${socket.data.playerName} joined room: ${roomName}`);
        io.to(roomName).emit('room updated', {
          players: room.players,
          messages: room.messages,
        });
      }
    } else {
      socket.emit('error', { message: 'Room does not exist' });
    }
  });

  // ส่งข้อความในแชท
  socket.on('chat message', ({ roomName, message }) => {
    if (!socket.data.playerName) {
      socket.emit('error', { message: 'You must set a player name first.' });
      return;
    }

    if (rooms[roomName]) {
      const chatMessage = { playerName: socket.data.playerName, message };
      rooms[roomName].messages.push(chatMessage);
      io.to(roomName).emit('chat message', chatMessage);
    } else {
      socket.emit('error', { message: 'Room does not exist' });
    }
  });

  // เริ่มเกม
  socket.on('start game', ({ roomName }) => {
    if (rooms[roomName]) {
      io.to(roomName).emit('game started', { game: rooms[roomName].game });
      console.log(`Game started in room: ${roomName}`);
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
        console.log(`Room deleted: ${roomName}`);
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
