import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job reference is required'],
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Applicant reference is required'],
    },
    matchPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    matchedSkills: {
      type: [String],
      default: [],
    },
    missingSkills: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: [
        'Pending',
        'Reviewed',
        'Shortlisted',
        'Interview Scheduled',
        'Accepted',
        'Rejected',
      ],
      default: 'Pending',
    },
    coverNote: {
      type: String,
      trim: true,
    },
    resumeUrl: {
      type: String,
    },
    employerNotes: {
      type: String,
      trim: true,
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
applicationSchema.index({ job: 1, matchPercentage: -1 });
applicationSchema.index({ job: 1, status: 1, matchPercentage: -1 });
applicationSchema.index({ applicant: 1, createdAt: -1 });
applicationSchema.index({ status: 1 });

const Application = mongoose.model('Application', applicationSchema);

export default Application;
