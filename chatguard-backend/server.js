// 1. IMPORT PACKAGES
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();
const { HfInference } = require('@huggingface/inference');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./User');
const Admin = require('./Admin');

// 2. INITIALIZE APP & SERVER
const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);

// 3. CONFIGURE SOCKET.IO
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// 4. CONSTANTS & HUGGING FACE CLIENT
const PORT = 4000;
const hf = new HfInference(process.env.HF_TOKEN);
const MODEL_TO_USE = 'KoalaAI/Text-Moderation';

// 5. MONGODB DATABASE SETUP
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => console.error('MongoDB connection error:', err));

// Private Message Model
const privateMessageSchema = new mongoose.Schema({
  text: String,
  from: String,
  to: String,
  mobileNumber: String,
  timestamp: { type: Date, default: Date.now },
  isFlagged: { type: Boolean, default: false }
});
const PrivateMessage = mongoose.model('PrivateMessage', privateMessageSchema);

// 6. AUTHENTICATION API ROUTES
// (Student/Admin Registration & Login - Same as before)
app.post('/api/register-student', async (req, res) => {
  try {
    const { username, name, mobileNumber, password } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).send('Student username is already taken');
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, name, mobileNumber, password: hashedPassword });
    await newUser.save();
    res.status(201).send('Student account registered successfully');
  } catch (error) { res.status(500).send('Error registering student'); }
});

app.post('/api/register-admin', async (req, res) => {
  try {
    const { mobileNumber, password } = req.body;
    const existingAdmin = await Admin.findOne({ mobileNumber });
    if (existingAdmin) return res.status(400).send('This mobile number is already registered');
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({ mobileNumber, password: hashedPassword });
    await newAdmin.save();
    res.status(201).send('Admin (Parent) account registered successfully');
  } catch (error) { res.status(500).send('Error registering admin'); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, mobileNumber, password } = req.body;
    if (username) {
      const user = await User.findOne({ username });
      if (!user || !(await bcrypt.compare(password, user.password))) return res.status(400).send('Invalid credentials');
      const token = jwt.sign({ userId: user._id, username: user.username, mobileNumber: user.mobileNumber, isAdmin: false }, 'YOUR_SECRET_JWT_KEY', { expiresIn: '1h' });
      res.json({ token, username: user.username, mobileNumber: user.mobileNumber, isAdmin: false });
    } else if (mobileNumber) {
      const admin = await Admin.findOne({ mobileNumber });
      if (!admin || !(await bcrypt.compare(password, admin.password))) return res.status(400).send('Invalid credentials');
      const token = jwt.sign({ userId: admin._id, mobileNumber: admin.mobileNumber, isAdmin: true }, 'YOUR_SECRET_JWT_KEY', { expiresIn: '1h' });
      res.json({ token, mobileNumber: admin.mobileNumber, isAdmin: true });
    } else { res.status(400).send('Invalid login request'); }
  } catch (error) { res.status(500).send('Error logging in'); }
});

// 7. AI ANALYSIS FUNCTION
async function analyzeMessage(text) {
  try {
    const response = await hf.textClassification({ model: MODEL_TO_USE, inputs: text });
    const topLabel = response.reduce((prev, current) => (prev.score > current.score) ? prev : current);
    return topLabel.label !== 'OK'; 
  } catch (error) {
    if (error.message.includes('503')) throw new Error('Model is loading');
    return false;
  }
}
// async function analyzeMessage(text) {
//   try {
//     const response = await hf.textClassification({ model: MODEL_TO_USE, inputs: text });
    
//     // --- DEBUG LOG ---
//     console.log(`Analysis for "${text}":`, JSON.stringify(response, null, 2)); 
//     // -----------------

//     // Handle potential nested array response (common with HF API)
//     const scores = Array.isArray(response) && Array.isArray(response[0]) ? response[0] : response;

//     const topLabel = scores.reduce((prev, current) => (prev.score > current.score) ? prev : current);
    
//     console.log(`Top Label: ${topLabel.label}, Score: ${topLabel.score}`);

//     return topLabel.label !== 'OK'; 
//   } catch (error) {
//     console.error('Error calling Hugging Face API:', error.message);
//     if (error.message.includes('503')) {
//        // It's loading. 
//        // Option A: Fail open (allow message) -> return false; 
//        // Option B: Fail closed (block message) -> throw new Error('Model loading');
//        throw new Error('Model is loading');
//     }
//     return false; 
//   }
// }
// 8. SOCKET.IO LOGIC
const userSocketMap = new Map(); // { username => socket.id }

io.on('connection', (socket) => {
  const username = socket.handshake.query.username; // Get username from query
  if (username) {
    console.log(`User connected: ${username} (${socket.id})`);
    userSocketMap.set(username, socket.id);
    io.emit('updateUserList', Array.from(userSocketMap.keys()));
  }

  // --- NEW: TYPING INDICATOR ---
  socket.on('typing', ({ to, isTyping }) => {
    const recipientSocketId = userSocketMap.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('userTyping', { from: username, isTyping }); 
    }
  });

  // 2. Load Private History
  socket.on('loadPrivateHistory', async ({ user1, user2 }) => {
    try {
      const history = await PrivateMessage.find({
        $or: [
          { from: user1, to: user2 },
          { from: user2, to: user1 }
        ]
      }).sort({ timestamp: 1 });
      socket.emit('privateHistoryLoaded', { withUser: user2, messages: history });
    } catch (err) { console.error(err); }
  });

  // 3. Handle Private Message
  socket.on('privateMessage', async (data) => {
    try {
      const isHarmful = await analyzeMessage(data.text);

      // Always save (flag if harmful)
      const savedMsg = new PrivateMessage({
        text: data.text,
        from: data.from,
        to: data.to,
        mobileNumber: data.mobileNumber,
        timestamp: data.timestamp || new Date(),
        isFlagged: isHarmful
      });
      await savedMsg.save();

      const messageData = { 
        text: data.text, from: data.from, to: data.to, id: data.id,
        timestamp: savedMsg.timestamp, isFlagged: isHarmful 
      };

      // Send to Recipient
      const recipientSocketId = userSocketMap.get(data.to);
      if (recipientSocketId) io.to(recipientSocketId).emit('privateMessage', messageData);
      
      // Send back to Sender
      socket.emit('privateMessage', messageData);

      // Admin Alerts
      if (isHarmful) {
        io.emit('adminNotification', {
          message: `Your child sent a flagged message: "${data.text}"`,
          sender: data.from, mobileNumber: data.mobileNumber, timestamp: new Date(), type: 'sent'
        });
        try {
          const recipientUser = await User.findOne({ username: data.to });
          if (recipientUser && recipientUser.mobileNumber) {
             io.emit('adminNotification', {
              message: `Your child received a harmful message from ${data.from}: "${data.text}"`,
              sender: data.to, mobileNumber: recipientUser.mobileNumber, timestamp: new Date(), type: 'received'
            });
          }
        } catch (err) { console.error(err); }
      }
    } catch (error) {
      if (error.message.includes('loading')) {
        socket.emit('systemNotification', { id: Date.now(), text: 'AI model waking up...', timestamp: new Date() });
      }
    }
  });

  socket.on('disconnect', () => {
    let disconnectedUser = null;
    for (const [u, id] of userSocketMap.entries()) {
      if (id === socket.id) { disconnectedUser = u; break; }
    }
    if (disconnectedUser) {
      userSocketMap.delete(disconnectedUser);
      io.emit('updateUserList', Array.from(userSocketMap.keys()));
    }
  });
});

server.listen(PORT, () => console.log(`Server running on ${PORT}`));