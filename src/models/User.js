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
    startYear: { type: Number },
    endYear: { type: Number },
    gradeOrCgpa: { type: String, trim: true },
  },
  { _id: false }
);

const experienceItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    location: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    current: { type: Boolean, default: false },
    description: { type: String, trim: true },
  },
  { _id: false }
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
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'fresh_graduate', 'professional', 'employer', 'admin'],
      default: 'student',
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
    resumeUrl: {
      type: String,
    },
    companyProfile: {
      companyName: { type: String, trim: true },
      industry: { type: String, trim: true },
      website: { type: String, trim: true },
      description: { type: String, trim: true },
      companySize: { type: String, trim: true },
    },
    refreshToken: {
      type: String,
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

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ 'skills.name': 1 });

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
