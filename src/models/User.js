import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const skillItemSchema = new mongoose.Schema(
  {
    skill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
    },
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    proficiency: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Expert'],
      default: 'Intermediate',
    },
  },
  { _id: false }
);

const educationItemSchema = new mongoose.Schema(
  {
    degree: { type: String, required: true, trim: true },
    institute: { type: String, required: true, trim: true },
    field: { type: String, trim: true },
    startYear: { type: Number },
    endYear: { type: Number },
    graduationYear: { type: String, trim: true },
    gradeOrCgpa: { type: String, trim: true },
    cgpa: { type: String, trim: true },
    status: { type: String, trim: true, default: 'Completed' },
  },
  { _id: true }
);

const experienceItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['experience', 'project'],
      default: 'experience',
    },
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    duration: { type: String, trim: true },
    location: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    current: { type: Boolean, default: false },
    description: { type: String, trim: true },
    link: { type: String, trim: true },
  },
  { _id: true }
);

const certificationItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    issuingOrganization: { type: String, trim: true },
    issueDate: { type: Date },
    credentialUrl: { type: String, trim: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false,
    },
    role: {
      type: String,
      enum: [
        'student',
        'fresh_graduate',
        'experienced',
        'professional',
        'employer',
        'admin',
      ],
      default: 'fresh_graduate',
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'banned'],
      default: 'active',
    },
    banReason: {
      type: String,
      trim: true,
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
    department: {
      type: String,
      default: 'Information Technology',
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    headline: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
    },
    skills: [skillItemSchema],
    education: [educationItemSchema],
    experience: [experienceItemSchema],
    certifications: [certificationItemSchema],
    links: {
      github: { type: String, trim: true, default: '' },
      linkedin: { type: String, trim: true, default: '' },
      portfolio: { type: String, trim: true, default: '' },
    },
    resumeUrl: {
      type: String,
      default: '',
    },
    resumeFileName: {
      type: String,
      default: '',
      trim: true,
    },
    resumeFileSize: {
      type: String,
      default: '',
      trim: true,
    },
    resumeUploadedAt: {
      type: Date,
    },
    companyProfile: {
      companyName: { type: String, trim: true },
      industry: { type: String, trim: true },
      website: { type: String, trim: true },
      description: { type: String, trim: true },
      companySize: { type: String, trim: true },
      tagline: { type: String, trim: true },
      logo: { type: String, trim: true },
      logoInitials: { type: String, trim: true },
      totalSeatsQuota: { type: Number, default: 12 },
      filledSeatsCount: { type: Number, default: 0 },
      ntnNumber: { type: String, trim: true, default: '' },
      secpRegNumber: { type: String, trim: true, default: '' },
      headquarters: { type: String, trim: true, default: '' },
      verificationStatus: {
        type: String,
        enum: ['verified', 'pending', 'suspended'],
        default: 'pending',
      },
      verifiedDate: { type: String, default: '' },
      submittedDate: { type: String, default: '' },
      rejectionReason: { type: String, trim: true, default: '' },
      documents: [
        {
          name: { type: String, required: true },
          verified: { type: Boolean, default: false },
          fileUrl: { type: String, default: '' },
        },
      ],
    },
    refreshToken: {
      type: String,
    },
    otpCode: {
      type: String,
      default: null,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ role: 1 });
userSchema.index({ 'skills.name': 1 });
userSchema.index({ location: 1 });
userSchema.index({ createdAt: -1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      name: this.name,
      role: this.role,
    },
    process.env.ACCESS_TOKEN_SECRET || 'access_secret_key',
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '1d',
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET || 'refresh_secret_key',
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '10d',
    }
  );
};

const User = mongoose.model('User', userSchema);

export default User;
