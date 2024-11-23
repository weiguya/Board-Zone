let rooms = {}; // เก็บข้อมูลห้อง

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // เมื่อผู้ใช้สร้างห้อง
  socket.on('create room', ({ roomName, maxPlayers, game }) => {
    if (rooms[roomName]) {
      socket.emit('error', { message: 'ห้องนี้มีอยู่แล้ว' });
    } else {
      rooms[roomName] = {
        creator: socket.id,
        maxPlayers,
        game,
        players: [{ id: socket.id, name: 'เจ้าของห้อง' }],
        pendingRequests: [],
      };
      socket.join(roomName);
      io.emit('rooms updated', rooms); // อัปเดตหน้า "ค้นหาห้อง"
    }
  });

  // เมื่อผู้ใช้ขอเข้าร่วมห้อง
  socket.on('request join', ({ roomName }) => {
    if (rooms[roomName]) {
      rooms[roomName].pendingRequests.push(socket.id);
      io.to(rooms[roomName].creator).emit('join requests', {
        roomName,
        requests: rooms[roomName].pendingRequests,
      });
    }
  });

  // เจ้าของห้องตอบคำขอเข้าร่วม
  socket.on('respond to request', ({ roomName, playerId, accept }) => {
    if (rooms[roomName]) {
      const requestIndex = rooms[roomName].pendingRequests.indexOf(playerId);
      if (requestIndex > -1) {
        rooms[roomName].pendingRequests.splice(requestIndex, 1);
        if (accept) {
          rooms[roomName].players.push({ id: playerId, name: `ผู้เล่น ${rooms[roomName].players.length + 1}` });
          io.to(playerId).emit('join approved', { roomName });
        } else {
          io.to(playerId).emit('join denied');
        }
        io.to(rooms[roomName].creator).emit('join requests', {
          roomName,
          requests: rooms[roomName].pendingRequests,
        });
        io.to(roomName).emit('room updated', { players: rooms[roomName].players });
      }
    }
  });

  // เมื่อเริ่มเกม
  socket.on('start game', ({ roomName }) => {
    if (rooms[roomName]) {
      io.to(roomName).emit('game started', { game: rooms[roomName].game });
    }
  });

  // เมื่อผู้ใช้ส่งข้อความในแชท
  socket.on('chat message', ({ roomName, message }) => {
    io.to(roomName).emit('chat message', { message });
  });

  // เมื่อผู้ใช้ตัดการเชื่อมต่อ
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    Object.keys(rooms).forEach((roomName) => {
      const room = rooms[roomName];
      room.players = room.players.filter((player) => player.id !== socket.id);
      if (room.creator === socket.id) {
        delete rooms[roomName];
      }
    });
    io.emit('rooms updated', rooms);
  });
});
