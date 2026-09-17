require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || '*';

// --- Security middleware ---
app.use(helmet());
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// --- Rate limiting ---
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 200 }));

// --- Health check (Render uses this) ---
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.get('/', (req, res) => res.json({ message: 'Chat API is running' }));

// --- Routes ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/items', require('./routes/items'));
app.use('/api/messages', require('./routes/messages'));

// --- 404 ---
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// --- Error handler ---
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

// --- Socket.IO ---
const io = new Server(server, {
  cors: { origin: CLIENT_URL, credentials: true },
  transports: ['websocket', 'polling'],
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(`user:${userId}`);
    console.log(`User ${userId} joined room`);
  });

  socket.on('send_message', async (data) => {
    const { senderId, receiverId, text } = data;
    if (!senderId || !receiverId || !text) return;

    try {
      const Message = require('./models/Message');
      const msg = await Message.create({ sender: senderId, receiver: receiverId, text });

      io.to(`user:${receiverId}`).emit('new_message', msg);
      io.to(`user:${senderId}`).emit('message_sent', msg);
    } catch (e) {
      console.error('Message error:', e.message);
    }
  });

  socket.on('typing', ({ senderId, receiverId }) => {
    io.to(`user:${receiverId}`).emit('user_typing', { senderId });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// --- DB + Start ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
