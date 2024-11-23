const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

let rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create room', ({ roomName, game, maxPlayers }) => {
    if (rooms[roomName]) {
      socket.emit('error', { message: 'Room already exists' });
    } else {
      rooms[roomName] = { game, maxPlayers, players: [socket.id] };
      socket.join(roomName);
      io.emit('rooms updated', { rooms: Object.keys(rooms) });
    }
  });

  socket.on('request join', ({ roomName }) => {
    if (rooms[roomName]) {
      socket.join(roomName);
      rooms[roomName].players.push(socket.id);
      io.to(roomName).emit('room updated', rooms[roomName]);
    }
  });

  socket.on('start game', ({ roomName }) => {
    io.to(roomName).emit('game started', rooms[roomName].game);
  });

  socket.on('disconnect', () => {
    Object.keys(rooms).forEach((roomName) => {
      rooms[roomName].players = rooms[roomName].players.filter((id) => id !== socket.id);
      if (rooms[roomName].players.length === 0) {
        delete rooms[roomName];
      }
    });
    io.emit('rooms updated', { rooms: Object.keys(rooms) });
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
