const express = require('express'); // Express framework
const http = require('http'); // Node.js HTTP module
const { Server } = require('socket.io'); // Socket.IO for real-time communication
const path = require('path'); // Path module for file handling

const app = express(); // Create Express app
const server = http.createServer(app); // Create HTTP server
const io = new Server(server); // Attach Socket.IO to the server

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Handle Socket.IO connections
io.on('connection', (socket) => {
  console.log('A user connected');

  // Listen for chat messages from the client
  socket.on('chat message', (msg) => {
    console.log('Message: ' + msg);

    // Broadcast the message to all connected clients
    io.emit('chat message', msg);
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Start the server on port 3000
server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
