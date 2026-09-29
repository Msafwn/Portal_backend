import mongoose from 'mongoose';

const requiredSkillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    weight: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },
    mandatory: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
    },
    jobType: {
      type: String,
      enum: [
        'Internship',
        'Entry-Level',
        'Mid-Level',
        'Senior-Level',
        'Full-Time',
        'Part-Time',
        'Contract',
      ],
      default: 'Entry-Level',
    },
    category: {
      type: String,
      default: 'Software Development',
      trim: true,
    },
    requiredSkills: {
      type: [requiredSkillSchema],
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: 'At least one required skill must be specified',
      },
    },
    minExperienceYears: {
      type: Number,
      default: 0,
      min: 0,
    },
    educationRequirement: {
      type: String,
      default:
        'BS in Computer Science / Software Engineering / IT or Equivalent',
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Job location is required'],
      trim: true,
    },
    workMode: {
      type: String,
      enum: ['On-site', 'Remote', 'Hybrid'],
      default: 'On-site',
    },
    salaryRange: {
      min: { type: Number },
      max: { type: Number },
      currency: { type: String, default: 'PKR' },
      isNegotiable: { type: Boolean, default: false },
    },
    deadline: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['Open', 'Closed', 'Draft'],
      default: 'Open',
    },
    applicantsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexing for faster searching and filtering
jobSchema.index({ title: 'text', description: 'text', category: 'text' });
jobSchema.index({ status: 1, createdAt: -1 });

const Job = mongoose.model('Job', jobSchema);

export default Job;
