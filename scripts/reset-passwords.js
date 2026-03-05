const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

// User Model (copied from backend/src/models/User.js to avoid dependency issues)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String },
  lastName: { type: String },
  role: { type: String, enum: ['guest', 'employee', 'admin'], default: 'guest' },
  isActive: { type: Boolean, default: true }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return; // next is not needed for async functions in newer Mongoose
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    // next(); // Not needed
  } catch (error) {
    throw error; // next(error); // Throw error instead
  }
});

const User = mongoose.model('User', userSchema);

const resetPasswords = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/hilton_reservations?authSource=admin';
    console.log(`Connecting to MongoDB: ${mongoURI}`);
    await mongoose.connect(mongoURI);
    console.log('MongoDB Connected');

    const testUsers = [
      { email: 'guest@example.com', password: 'password123' },
      { email: 'employee@example.com', password: 'password123' },
      { email: 'admin@example.com', password: 'password123' },
      { email: 'testlogin@example.com', password: 'password123' }
    ];

    for (const userData of testUsers) {
      const user = await User.findOne({ email: userData.email });
      if (user) {
        // Manually setting password to trigger pre-save hook
        user.password = userData.password;
        await user.save();
        console.log(`Password reset for ${userData.email}`);
      } else {
        console.log(`User not found: ${userData.email}`);
      }
    }

    console.log('All passwords have been reset successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting passwords:', error);
    process.exit(1);
  }
};

resetPasswords();
