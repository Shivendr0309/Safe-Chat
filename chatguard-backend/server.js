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
const server = http.createServer(app);

// 3. MIDDLEWARE

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://shivendr0309.github.io"
  ],
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Safe-Chat backend is running");
});

// 4. SOCKET.IO CONFIG
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://shivendr0309.github.io"
    ],
    methods: ["GET", "POST"]
  }
});

// 5. CONSTANTS
const PORT = process.env.PORT || 4000;

const hf = new HfInference(process.env.HF_TOKEN);
const MODEL_TO_USE = "KoalaAI/Text-Moderation";

// 6. DATABASE CONNECTION
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch(err => console.error("MongoDB connection error:", err));

// Message Schema
const privateMessageSchema = new mongoose.Schema({
  text: String,
  from: String,
  to: String,
  mobileNumber: String,
  timestamp: { type: Date, default: Date.now },
  isFlagged: { type: Boolean, default: false }
});

const PrivateMessage = mongoose.model("PrivateMessage", privateMessageSchema);

// 7. AUTH ROUTES

// Student Registration
app.post("/api/register-student", async (req, res) => {
  try {

    const { username, name, mobileNumber, password } = req.body;

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(400).send("Username already taken");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      name,
      mobileNumber,
      password: hashedPassword
    });

    await newUser.save();

    res.status(201).send("Student registered successfully");

  } catch (error) {
    res.status(500).send("Registration error");
  }
});

// Admin Registration
app.post("/api/register-admin", async (req, res) => {
  try {

    const { mobileNumber, password } = req.body;

    const existingAdmin = await Admin.findOne({ mobileNumber });

    if (existingAdmin) {
      return res.status(400).send("Admin already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new Admin({
      mobileNumber,
      password: hashedPassword
    });

    await newAdmin.save();

    res.status(201).send("Admin registered successfully");

  } catch (error) {
    res.status(500).send("Admin registration error");
  }
});

// Login
app.post("/api/login", async (req, res) => {

  try {

    const { username, mobileNumber, password } = req.body;

    if (username) {

      const user = await User.findOne({ username });

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).send("Invalid credentials");
      }

      const token = jwt.sign(
        {
          userId: user._id,
          username: user.username,
          mobileNumber: user.mobileNumber,
          isAdmin: false
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      res.json({
        token,
        username: user.username,
        mobileNumber: user.mobileNumber,
        isAdmin: false
      });

    }

    else if (mobileNumber) {

      const admin = await Admin.findOne({ mobileNumber });

      if (!admin || !(await bcrypt.compare(password, admin.password))) {
        return res.status(400).send("Invalid credentials");
      }

      const token = jwt.sign(
        {
          userId: admin._id,
          mobileNumber: admin.mobileNumber,
          isAdmin: true
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      res.json({
        token,
        mobileNumber: admin.mobileNumber,
        isAdmin: true
      });

    }

  } catch (error) {
    res.status(500).send("Login error");
  }

});

// 8. AI MODERATION FUNCTION
async function analyzeMessage(text) {

  try {

    const response = await hf.textClassification({
      model: MODEL_TO_USE,
      inputs: text
    });

    const scores = Array.isArray(response[0]) ? response[0] : response;

    const topLabel = scores.reduce((prev, current) =>
      prev.score > current.score ? prev : current
    );

    return topLabel.label !== "OK";

  } catch (error) {

    console.error("AI moderation error:", error.message);

    return false;
  }

}

// 9. SOCKET.IO CHAT LOGIC

const userSocketMap = new Map();

io.on("connection", (socket) => {

  const username = socket.handshake.query.username;

  if (username) {
    userSocketMap.set(username, socket.id);
    io.emit("updateUserList", Array.from(userSocketMap.keys()));
  }

  // Typing indicator
  socket.on("typing", ({ to, isTyping }) => {

    const recipientSocketId = userSocketMap.get(to);

    if (recipientSocketId) {

      io.to(recipientSocketId).emit("userTyping", {
        from: username,
        isTyping
      });

    }

  });

  // Load chat history
  socket.on("loadPrivateHistory", async ({ user1, user2 }) => {

    const history = await PrivateMessage.find({
      $or: [
        { from: user1, to: user2 },
        { from: user2, to: user1 }
      ]
    }).sort({ timestamp: 1 });

    socket.emit("privateHistoryLoaded", {
      withUser: user2,
      messages: history
    });

  });

  // Send message
  socket.on("privateMessage", async (data) => {

    const isHarmful = await analyzeMessage(data.text);

    const savedMsg = new PrivateMessage({
      text: data.text,
      from: data.from,
      to: data.to,
      mobileNumber: data.mobileNumber,
      isFlagged: isHarmful
    });

    await savedMsg.save();

    const messageData = {
      text: data.text,
      from: data.from,
      to: data.to,
      timestamp: savedMsg.timestamp,
      isFlagged: isHarmful
    };

    const recipientSocketId = userSocketMap.get(data.to);

    if (recipientSocketId) {
      io.to(recipientSocketId).emit("privateMessage", messageData);
    }

    socket.emit("privateMessage", messageData);

  });

  socket.on("disconnect", () => {

    for (const [user, id] of userSocketMap.entries()) {

      if (id === socket.id) {
        userSocketMap.delete(user);
        break;
      }

    }

    io.emit("updateUserList", Array.from(userSocketMap.keys()));

  });

});

// 10. START SERVER
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});