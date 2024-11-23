const express = require('express');
const path = require('path');
const http = require('http');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

// เสิร์ฟไฟล์ static จากโฟลเดอร์ public
app.use(express.static(path.join(__dirname, 'public')));

// เสิร์ฟหน้าแรก (index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// เสิร์ฟหน้าเลือกโหมด (select-mode.html)
app.get('/select-mode.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'select-mode.html'));
});

// เริ่มเซิร์ฟเวอร์
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
