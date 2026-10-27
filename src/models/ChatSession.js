import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    sender: { type: String, enum: ['user', 'ai', 'system'], default: 'user' },
    text: { type: String, required: true },
    timestamp: { type: String, default: '' },
    attachments: { type: mongoose.Schema.Types.Mixed, default: null },
    source: { type: String, default: '' },
  },
  { _id: false }
);

const chatSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'Career Exploration',
      trim: true,
    },
    messages: [chatMessageSchema],
  },
  {
    timestamps: true,
  }
);

// Compound index so a user's session ID is fast to query and unique per user
chatSessionSchema.index({ user: 1, sessionId: 1 }, { unique: true });

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
export default ChatSession;
