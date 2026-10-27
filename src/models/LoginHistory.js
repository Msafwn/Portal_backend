import mongoose from 'mongoose';

const loginHistorySchema = new mongoose.Schema(
  {
    user: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      default: 'student',
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
    device: {
      type: String,
      default: 'Desktop (Chrome / Windows)',
    },
    location: {
      type: String,
      default: 'Islamabad, PK',
    },
    status: {
      type: String,
      default: 'Successful',
    },
    statusType: {
      type: String,
      enum: ['success', 'warning', 'danger'],
      default: 'success',
    },
  },
  {
    timestamps: true,
  }
);

loginHistorySchema.index({ createdAt: -1 });
loginHistorySchema.index({ email: 1 });

const LoginHistory = mongoose.model('LoginHistory', loginHistorySchema);

export default LoginHistory;
