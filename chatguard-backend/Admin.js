const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  // The mobile number is the Parent's "username"
  mobileNumber: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  linkedStudentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;