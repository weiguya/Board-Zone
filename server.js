const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 10000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Store rooms in memory
let rooms = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Create room handler
    socket.on('create room', ({ roomName, playerName, game, maxPlayers }) => {
        console.log('Creating room:', { roomName, playerName, game, maxPlayers });

        // Check if room exists
        if (rooms[roomName]) {
            socket.emit('room created', {
                success: false,
                message: 'ห้องนี้มีอยู่แล้ว กรุณาเลือกชื่อห้องอื่น'
            });
            return;
        }

        // Create new room
        rooms[roomName] = {
            name: roomName,
            game,
            maxPlayers: parseInt(maxPlayers),
            players: [{
                id: socket.id,
                name: playerName,
                isHost: true,
                isReady: false
            }],
            host: socket.id
        };

        // Join socket to room
        socket.join(roomName);

        console.log('Room created:', rooms[roomName]);

        // Emit success response
        socket.emit('room created', {
            success: true,
            roomName
        });

        // Emit room update
        io.to(roomName).emit('room updated', {
            players: rooms[roomName].players,
            maxPlayers: rooms[roomName].maxPlayers
        });
    });

    // Join room handler
    socket.on('join room', ({ roomName, playerName, isHost, game, maxPlayers }) => {
        console.log('Joining room:', { roomName, playerName, isHost });
        console.log('Available rooms:', rooms);

        // If room doesn't exist and player is host, create it
        if (!rooms[roomName] && isHost) {
            rooms[roomName] = {
                name: roomName,
                game: game || 'Unknown',
                maxPlayers: parseInt(maxPlayers) || 5,
                players: [],
                host: socket.id
            };
            console.log('Created room on join:', rooms[roomName]);
        }

        // Check if room exists
        if (!rooms[roomName]) {
            console.log('Room not found:', roomName);
            socket.emit('error', { message: 'ไม่พบห้องนี้' });
            return;
        }

        const room = rooms[roomName];

        // Check if player already exists (reconnecting)
        const existingPlayerIndex = room.players.findIndex(p => p.name === playerName);
        
        if (existingPlayerIndex !== -1) {
            // Update existing player's socket id
            room.players[existingPlayerIndex].id = socket.id;
            room.players[existingPlayerIndex].isReady = false;
        } else {
            // Add new player
            room.players.push({
                id: socket.id,
                name: playerName,
                isHost: isHost,
                isReady: false
            });
        }

        // Join socket to room
        socket.join(roomName);

        console.log('Updated room state:', rooms[roomName]);

        // Emit room update to all clients in room
        io.to(roomName).emit('room updated', {
            players: room.players,
            maxPlayers: room.maxPlayers
        });
    });

    // Toggle ready status handler
    socket.on('toggle ready', ({ roomName }) => {
        console.log('Toggle ready in room:', roomName);
        
        const room = rooms[roomName];
        if (!room) {
            console.log('Room not found for toggle ready');
            return;
        }

        const player = room.players.find(p => p.id === socket.id);
        if (player && !player.isHost) {
            player.isReady = !player.isReady;
            console.log(`Player ${player.name} ready status: ${player.isReady}`);
            
            io.to(roomName).emit('room updated', {
                players: room.players,
                maxPlayers: room.maxPlayers
            });
        }
    });

    // Leave room handler
    socket.on('leave room', ({ roomName }) => {
        console.log('Player leaving room:', roomName);
        
        const room = rooms[roomName];
        if (!room) {
            console.log('Room not found for leaving');
            return;
        }

        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
            const wasHost = room.players[playerIndex].isHost;
            room.players.splice(playerIndex, 1);

            // If room is empty, remove it
            if (room.players.length === 0) {
                delete rooms[roomName];
                console.log(`Room ${roomName} deleted (empty)`);
            } else if (wasHost) {
                // Assign new host
                room.players[0].isHost = true;
                room.host = room.players[0].id;
                console.log(`New host assigned in room ${roomName}:`, room.players[0].name);
            }

            socket.leave(roomName);
            socket.emit('left room');

            if (room.players.length > 0) {
                io.to(roomName).emit('room updated', {
                    players: room.players,
                    maxPlayers: room.maxPlayers
                });
            }
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // Find and remove player from their room
        Object.keys(rooms).forEach(roomName => {
            const room = rooms[roomName];
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            
            if (playerIndex !== -1) {
                const wasHost = room.players[playerIndex].isHost;
                room.players.splice(playerIndex, 1);

                // If room is empty, remove it
                if (room.players.length === 0) {
                    delete rooms[roomName];
                    console.log(`Room ${roomName} deleted (empty)`);
                } else if (wasHost) {
                    // Assign new host
                    room.players[0].isHost = true;
                    room.host = room.players[0].id;
                    io.to(roomName).emit('room updated', {
                        players: room.players,
                        maxPlayers: room.maxPlayers
                    });
                }
            }
        });
    });

    // Get rooms list handler
    socket.on('get rooms', () => {
        // Filter and format rooms data
        const roomsList = {};
        for (const [roomName, room] of Object.entries(rooms)) {
            roomsList[roomName] = {
                game: room.game,
                maxPlayers: room.maxPlayers,
                players: room.players,
                host: room.host
            };
        }
        socket.emit('rooms list', roomsList);
    });
});

// Debug endpoint - list all rooms
app.get('/debug/rooms', (req, res) => {
    res.json(rooms);
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
