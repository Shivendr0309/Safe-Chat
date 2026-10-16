require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { HfInference } = require('@huggingface/inference');

const User = require('./User');
const Admin = require('./Admin');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;
const MODEL_TO_USE = process.env.HF_MODEL || 'KoalaAI/Text-Moderation';
const hf = process.env.HF_TOKEN ? new HfInference(process.env.HF_TOKEN) : null;

const allowedOrigins = (process.env.CLIENT_ORIGINS ||
  'http://localhost:3000,https://shivendr0309.github.io')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  credentials: true,
}));
app.use(express.json({ limit: '20kb' }));

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const privateMessageSchema = new mongoose.Schema({
  text: { type: String, required: true, maxlength: 2000, trim: true },
  from: { type: String, required: true, index: true },
  to: { type: String, required: true, index: true },
  mobileNumber: { type: String, default: '', index: true },
  recipientMobileNumber: { type: String, default: '', index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  isFlagged: { type: Boolean, default: false, index: true },
  moderationStatus: {
    type: String,
    enum: ['complete', 'unavailable'],
    default: 'unavailable',
  },
});
privateMessageSchema.index({ from: 1, to: 1, timestamp: 1 });
privateMessageSchema.index({ to: 1, from: 1, timestamp: 1 });
const PrivateMessage = mongoose.models.PrivateMessage ||
  mongoose.model('PrivateMessage', privateMessageSchema);

function createToken(payload) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

function authenticateHttp(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ message: 'Authentication required' });

  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired session' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.auth?.isAdmin) {
    return res.status(403).json({ message: 'Parent account required' });
  }
  return next();
}

app.get('/', (_req, res) => {
  res.json({ name: 'Safe-Chat API', status: 'running' });
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: mongoose.connection.readyState === 1 ? 'ok' : 'degraded',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    moderation: hf ? 'configured' : 'not-configured',
  });
});

app.post('/api/register-student', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    const name = String(req.body.name || '').trim();
    const mobileNumber = String(req.body.mobileNumber || '').trim();
    const password = String(req.body.password || '');

    if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) {
      return res.status(400).json({ message: 'Username must be 3–30 characters and use letters, numbers, dots, underscores or hyphens' });
    }
    if (!name || name.length > 100) {
      return res.status(400).json({ message: 'Please provide a valid full name' });
    }
    if (!/^\+?[0-9]{10,15}$/.test(mobileNumber)) {
      return res.status(400).json({ message: 'Enter a valid parent mobile number' });
    }
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({ message: 'Password must contain at least 8 characters' });
    }

    const existingUser = await User.findOne({ username }).lean();
    if (existingUser) return res.status(409).json({ message: 'Username already taken' });

    const user = await User.create({
      username,
      name,
      mobileNumber,
      password: await bcrypt.hash(password, 12),
    });

    return res.status(201).json({
      message: 'Student registered successfully',
      username: user.username,
    });
  } catch (error) {
    if (error.code === 11000) {
      const duplicateFields = Object.keys(error.keyPattern || error.keyValue || {});
      console.error('Student registration duplicate-key error:', {
        duplicateFields,
        message: error.message,
      });
      if (duplicateFields.includes('username')) {
        return res.status(409).json({ message: 'Username already taken' });
      }
      return res.status(409).json({
        message: 'A database value conflicts with an existing record. Please check the registration details or contact support.',
      });
    }
    console.error('Student registration failed:', error.message);
    return res.status(500).json({ message: 'Could not register student' });
  }
});

app.post('/api/register-admin', async (req, res) => {
  try {
    const mobileNumber = String(req.body.mobileNumber || '').trim();
    const password = String(req.body.password || '');

    if (!/^\+?[0-9]{10,15}$/.test(mobileNumber)) {
      return res.status(400).json({ message: 'Enter a valid mobile number' });
    }
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({ message: 'Password must contain at least 8 characters' });
    }

    const existingAdmin = await Admin.findOne({ mobileNumber }).lean();
    if (existingAdmin) return res.status(409).json({ message: 'Parent account already exists' });

    await Admin.create({
      mobileNumber,
      password: await bcrypt.hash(password, 12),
    });
    return res.status(201).json({ message: 'Parent account registered successfully' });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Parent account already exists' });
    console.error('Parent registration failed:', error.message);
    return res.status(500).json({ message: 'Could not register parent account' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const password = String(req.body.password || '');
    if (!password) return res.status(400).json({ message: 'Password is required' });

    if (req.body.username) {
      const username = String(req.body.username).trim();
      const user = await User.findOne({ username });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = createToken({
        userId: String(user._id),
        username: user.username,
        mobileNumber: user.mobileNumber,
        isAdmin: false,
      });
      return res.json({
        token,
        username: user.username,
        name: user.name,
        mobileNumber: user.mobileNumber,
        isAdmin: false,
      });
    }

    if (req.body.mobileNumber) {
      const mobileNumber = String(req.body.mobileNumber).trim();
      const admin = await Admin.findOne({ mobileNumber });
      if (!admin || !(await bcrypt.compare(password, admin.password))) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = createToken({
        userId: String(admin._id),
        mobileNumber: admin.mobileNumber,
        isAdmin: true,
      });
      return res.json({ token, mobileNumber: admin.mobileNumber, isAdmin: true });
    }

    return res.status(400).json({ message: 'Provide a username or parent mobile number' });
  } catch (error) {
    console.error('Login failed:', error.message);
    return res.status(500).json({ message: 'Could not log in' });
  }
});

app.get('/api/admin/alerts', authenticateHttp, requireAdmin, async (req, res) => {
  try {
    const messages = await PrivateMessage.find({
      $or: [
        { mobileNumber: req.auth.mobileNumber },
        { recipientMobileNumber: req.auth.mobileNumber },
      ],
      isFlagged: true,
    }).sort({ timestamp: -1 }).limit(100).lean();

    return res.json(messages.map((message) => ({
      id: String(message._id),
      message: message.text,
      sender: message.from,
      recipient: message.to,
      type: message.mobileNumber === req.auth.mobileNumber ? 'sent' : 'received',
      timestamp: message.timestamp,
      mobileNumber: message.mobileNumber,
      isFlagged: message.isFlagged,
    })));
  } catch (error) {
    console.error('Loading parent alerts failed:', error.message);
    return res.status(500).json({ message: 'Could not load alerts' });
  }
});

async function analyzeMessage(text) {
  if (!hf) return { isFlagged: false, status: 'unavailable' };

  try {
    const result = await hf.textClassification({ model: MODEL_TO_USE, inputs: text });
    const scores = Array.isArray(result?.[0]) ? result[0] : result;
    if (!Array.isArray(scores) || scores.length === 0) {
      return { isFlagged: false, status: 'unavailable' };
    }
    const top = scores.reduce((best, item) => item.score > best.score ? item : best);
    return {
      isFlagged: String(top.label || '').toUpperCase() !== 'OK',
      status: 'complete',
    };
  } catch (error) {
    console.error('AI moderation failed:', error.message);
    return { isFlagged: false, status: 'unavailable' };
  }
}

io.use((socket, next) => {
  try {
    if (!JWT_SECRET) return next(new Error('Server authentication is not configured'));
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    socket.data.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return next(new Error('Invalid or expired session'));
  }
});

const userSocketMap = new Map();

function emitOnlineUsers() {
  io.emit('updateUserList', Array.from(userSocketMap.keys()));
}

function sendParentAlert(mobileNumber, message, type) {
  if (!mobileNumber) return;
  for (const connectedSocket of io.sockets.sockets.values()) {
    const identity = connectedSocket.data.user;
    if (identity?.isAdmin && identity.mobileNumber === mobileNumber) {
      connectedSocket.emit('adminNotification', {
        id: String(message._id),
        mobileNumber,
        type,
        message: message.text,
        sender: message.from,
        recipient: message.to,
        timestamp: message.timestamp,
      });
    }
  }
}

io.on('connection', (socket) => {
  const identity = socket.data.user;
  if (identity.isAdmin) {
    socket.join(`parent:${identity.mobileNumber}`);
  } else if (identity.username) {
    userSocketMap.set(identity.username, socket.id);
    emitOnlineUsers();
  }

  socket.on('typing', ({ to, isTyping } = {}) => {
    if (identity.isAdmin || !identity.username || typeof to !== 'string') return;
    const recipientSocketId = userSocketMap.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('userTyping', {
        from: identity.username,
        isTyping: Boolean(isTyping),
      });
    }
  });

  socket.on('loadPrivateHistory', async ({ user2 } = {}) => {
    if (identity.isAdmin || !identity.username || typeof user2 !== 'string' || user2 === identity.username) {
      return socket.emit('chatError', { message: 'Invalid conversation' });
    }

    try {
      const history = await PrivateMessage.find({
        $or: [
          { from: identity.username, to: user2 },
          { from: user2, to: identity.username },
        ],
      }).sort({ timestamp: 1 }).limit(500).lean();

      socket.emit('privateHistoryLoaded', {
        withUser: user2,
        messages: history.map((message) => ({
          id: String(message._id),
          text: message.text,
          from: message.from,
          to: message.to,
          timestamp: message.timestamp,
          isFlagged: message.isFlagged,
          moderationStatus: message.moderationStatus,
        })),
      });
    } catch (error) {
      console.error('Loading chat history failed:', error.message);
      socket.emit('chatError', { message: 'Could not load chat history' });
    }
  });

  socket.on('privateMessage', async (data = {}) => {
    if (identity.isAdmin || !identity.username) return;
    const text = typeof data.text === 'string' ? data.text.trim() : '';
    const to = typeof data.to === 'string' ? data.to.trim() : '';

    if (!text || text.length > 2000 || !to || to === identity.username) {
      return socket.emit('chatError', { message: 'Message must be 1–2000 characters and have a valid recipient' });
    }

    try {
      const recipient = await User.findOne({ username: to }).select('username mobileNumber').lean();
      if (!recipient) return socket.emit('chatError', { message: 'Recipient does not exist' });

      const moderation = await analyzeMessage(text);
      const saved = await PrivateMessage.create({
        text,
        from: identity.username,
        to,
        mobileNumber: identity.mobileNumber || '',
        recipientMobileNumber: recipient.mobileNumber || '',
        isFlagged: moderation.isFlagged,
        moderationStatus: moderation.status,
      });

      const message = {
        id: String(saved._id),
        text: saved.text,
        from: saved.from,
        to: saved.to,
        timestamp: saved.timestamp,
        isFlagged: saved.isFlagged,
        moderationStatus: saved.moderationStatus,
      };

      const recipientSocketId = userSocketMap.get(to);
      if (recipientSocketId) io.to(recipientSocketId).emit('privateMessage', message);
      socket.emit('privateMessage', message);

      if (saved.isFlagged) {
        sendParentAlert(identity.mobileNumber, saved, 'sent');
        if (recipient.mobileNumber !== identity.mobileNumber) {
          sendParentAlert(recipient.mobileNumber, saved, 'received');
        }
      }
      if (moderation.status === 'unavailable') {
        socket.emit('moderationUnavailable', {
          message: 'AI moderation is temporarily unavailable. This message was not classified.',
        });
      }
    } catch (error) {
      console.error('Sending message failed:', error.message);
      socket.emit('chatError', { message: 'Message could not be sent' });
    }
  });

  socket.on('disconnect', () => {
    if (identity.username && userSocketMap.get(identity.username) === socket.id) {
      userSocketMap.delete(identity.username);
      emitOnlineUsers();
    }
  });
});

async function start() {
  if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');
  if (!MONGO_URI) throw new Error('MONGO_URI environment variable is required');
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected');
  server.listen(PORT, () => console.log(`Safe-Chat API listening on port ${PORT}`));
}

start().catch((error) => {
  console.error('Safe-Chat startup failed:', error.message);
  process.exit(1);
});

