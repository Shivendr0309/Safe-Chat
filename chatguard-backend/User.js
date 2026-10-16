const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true 
  },
  // --- NEW: Add the student's full name ---
  name: {
    type: String,
    required: true
  },
  // --- END NEW ---
  password: { 
    type: String, 
    required: true 
  },
  // This is the link to the parent's account
  mobileNumber: { 
    type: String, 
    required: true 
  }, 
  isAdmin: { 
    type: Boolean, 
    default: false 
  },
  linkedParentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }],
  parentLinkCodeHash: { type: String, default: null, select: false },
  parentLinkCodeExpiresAt: { type: Date, default: null, select: false }
});

const User = mongoose.model('User', userSchema);
module.exports = User;