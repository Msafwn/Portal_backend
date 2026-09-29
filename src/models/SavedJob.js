import mongoose from 'mongoose';

const savedJobSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job reference is required'],
    },
  },
  {
    timestamps: true,
  }
);

savedJobSchema.index({ user: 1, job: 1 }, { unique: true });
savedJobSchema.index({ user: 1, createdAt: -1 });

const SavedJob = mongoose.model('SavedJob', savedJobSchema);

export default SavedJob;
