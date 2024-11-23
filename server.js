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
      console.log(`Room created: ${roomName}, Game: ${game}, Max Players: ${maxPlayers}`);
      io.emit('rooms updated', { rooms: Object.keys(rooms) }); // อัปเดตรายชื่อห้องทั้งหมด
    }
  });

  // เมื่อผู้ใช้ขอข้อมูลห้องทั้งหมด (หน้า Find Room)
  socket.on('get rooms', () => {
    socket.emit('rooms list', { rooms: Object.keys(rooms) });
  });

  // เมื่อผู้ใช้ขอเข้าร่วมห้อง
  socket.on('request join', ({ roomName, playerName }) => {
    if (rooms[roomName]) {
      const isPlayerExists = rooms[roomName].players.some((player) => player.id === socket.id);

      if (!isPlayerExists) {
        rooms[roomName].players.push({ id: socket.id, name: playerName });
      }
      socket.join(roomName);

      io.to(roomName).emit('room updated', {
        players: rooms[roomName].players,
        messages: rooms[roomName].messages,
      });
    } else {
      socket.emit('error', { message: 'Room does not exist' });
    }
  });

  // เมื่อผู้ใช้ส่งข้อความในแชท
  socket.on('chat message', ({ roomName, playerName, message }) => {
    if (rooms[roomName]) {
      const chatMessage = { playerName, message };
      rooms[roomName].messages.push(chatMessage); // เก็บข้อความไว้ในห้อง
      io.to(roomName).emit('chat message', chatMessage); // ส่งข้อความถึงทุกคนในห้อง
    } else {
      socket.emit('error', { message: 'Room does not exist' });
    }
  });

  // เมื่อเริ่มเกม
  socket.on('start game', ({ roomName }) => {
    if (rooms[roomName]) {
      io.to(roomName).emit('game started', { game: rooms[roomName].game });
      console.log(`Game started in room: ${roomName}`);
    } else {
      socket.emit('error', { message: 'Room does not exist' });
    }
  });

  // เมื่อผู้ใช้ตัดการเชื่อมต่อ
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    Object.keys(rooms).forEach((roomName) => {
      const room = rooms[roomName];
      room.players = room.players.filter((player) => player.id !== socket.id);

      // หากห้องไม่มีผู้เล่นแล้ว ให้ลบห้อง
      if (room.players.length === 0) {
        delete rooms[roomName];
        console.log(`Room deleted: ${roomName}`);
      } else {
        io.to(roomName).emit('room updated', { players: room.players, messages: room.messages });
      }
    });
    io.emit('rooms updated', { rooms: Object.keys(rooms) }); // อัปเดตข้อมูลห้องทั้งหมด
  });
});

// เริ่มเซิร์ฟเวอร์
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
