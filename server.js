const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 10000;

app.use(express.static(path.join(__dirname, 'public')));

let rooms = {};

io.on('connection', (socket) => {
  console.log('User connected - Socket ID:', socket.id);

  // สร้างห้อง
  socket.on('create room', ({ roomName, playerName }) => {
    console.log(`Create room request - Room: ${roomName}, Player: ${playerName}`);
    
    if (!rooms[roomName]) {
      rooms[roomName] = {
        players: [{ id: socket.id, name: playerName }],
        messages: [],
      };
      socket.join(roomName);
      console.log(`Room "${roomName}" created successfully`);
      console.log('Current players:', rooms[roomName].players);
      
      io.emit('rooms updated', { rooms: Object.keys(rooms) });
    } else {
      console.log(`Room "${roomName}" already exists`);
      socket.emit('error', { message: 'ห้องนี้มีอยู่แล้ว!' });
    }
  });

  // เข้าร่วมห้อง
  socket.on('join room', ({ roomName, playerName }) => {
    console.log(`Join room request - Room: ${roomName}, Player: ${playerName}`);
    
    if (rooms[roomName]) {
      // เช็คว่าผู้เล่นอยู่ในห้องแล้วหรือไม่
      const existingPlayer = rooms[roomName].players.find(p => p.name === playerName);
      if (existingPlayer) {
        console.log(`Player "${playerName}" already in room "${roomName}"`);
        // อัพเดท socket.id ถ้าผู้เล่นเชื่อมต่อใหม่
        existingPlayer.id = socket.id;
      } else {
        rooms[roomName].players.push({ id: socket.id, name: playerName });
        console.log(`Added player "${playerName}" to room "${roomName}"`);
      }

      socket.join(roomName);
      console.log('Current room state:', {
        roomName,
        players: rooms[roomName].players,
        messageCount: rooms[roomName].messages.length
      });

      io.to(roomName).emit('room updated', {
        players: rooms[roomName].players,
        messages: rooms[roomName].messages,
      });
    } else {
      console.log(`Room "${roomName}" not found`);
      socket.emit('error', { message: 'ไม่พบห้องนี้!' });
    }
  });

  // ส่งข้อความแชท
  socket.on('chat message', ({ roomName, playerName, message }) => {
    console.log(`Chat message in room "${roomName}" from "${playerName}":`, message);
    
    if (rooms[roomName]) {
      const chatMessage = { playerName, message };
      rooms[roomName].messages.push(chatMessage);
      io.to(roomName).emit('chat message', chatMessage);
    }
  });

  // ตัดการเชื่อมต่อ
  socket.on('disconnect', () => {
    console.log('User disconnected - Socket ID:', socket.id);
    
    for (const roomName in rooms) {
      const index = rooms[roomName].players.findIndex(
        (player) => player.id === socket.id
      );
      
      if (index !== -1) {
        const playerName = rooms[roomName].players[index].name;
        console.log(`Removing player "${playerName}" from room "${roomName}"`);
        
        rooms[roomName].players.splice(index, 1);
        
        if (rooms[roomName].players.length === 0) {
          console.log(`Room "${roomName}" is empty, deleting room`);
          delete rooms[roomName];
        } else {
          console.log(`Updated player list for room "${roomName}":`, 
            rooms[roomName].players.map(p => p.name));
          
          io.to(roomName).emit('room updated', {
            players: rooms[roomName].players,
            messages: rooms[roomName].messages,
          });
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
