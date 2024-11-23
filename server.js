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

// จัดการการเชื่อมต่อของ Socket.IO
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // เมื่อผู้ใช้สร้างห้อง
  socket.on('create room', ({ roomName, playerName, game, maxPlayers }) => {
    if (!rooms[roomName]) {
      rooms[roomName] = {
        game,
        maxPlayers,
        players: [{ id: socket.id, name: playerName }],
        messages: [],
      };
      socket.join(roomName);
      console.log(`Room created: ${roomName}, Game: ${game}, Max Players: ${maxPlayers}`);
      io.emit('rooms updated', { rooms: Object.keys(rooms) }); // อัปเดตข้อมูลห้องทั้งหมดให้ทุกคน
    } else {
      socket.emit('error', { message: 'Room already exists!' });
    }
  });

  // เมื่อผู้ใช้ส่งข้อความในแชท
  socket.on('chat message', ({ roomName, playerName, message }) => {
    if (rooms[roomName]) {
      const chatMessage = { playerName, message };
      rooms[roomName].messages.push(chatMessage); // เก็บข้อความในห้อง
      io.to(roomName).emit('chat message', chatMessage); // ส่งข้อความไปยังทุกคนในห้อง
    } else {
      socket.emit('error', { message: 'Room does not exist!' });
    }
  });

  // อัปเดตรายชื่อผู้เล่นในห้อง
  socket.on('join room', ({ roomName, playerName }) => {
    if (rooms[roomName]) {
      const room = rooms[roomName];

      if (!room.players.some((player) => player.id === socket.id)) {
        room.players.push({ id: socket.id, name: playerName });
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
    io.emit('rooms updated', { rooms: Object.keys(rooms) }); // อัปเดตข้อมูลห้องทั้งหมด
  });
});

// เริ่มเซิร์ฟเวอร์
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
