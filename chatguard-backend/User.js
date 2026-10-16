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
  // Optional parent contact number. Parent account linking uses the one-time code,
  // not this field; the parent may sign in with a different number.
  mobileNumber: {
    type: String,
    default: ''
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