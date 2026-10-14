'use strict';

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const PORT = process.env.PORT || 3000;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// Serve static files from public/
app.use(express.static(path.join(__dirname, '..', 'public')));

// Health check
app.get('/ping', (_req, res) => res.json({ ok: true }));

// Socket.IO — placeholder until M3
io.on('connection', (socket) => {
  console.log(`[socket] connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[socket] disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Lexi Clash server listening on http://localhost:${PORT}`);
});

module.exports = { app, io };
