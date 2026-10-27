import mongoose from 'mongoose';

const interviewSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      id: { type: String, default: '' },
      title: { type: String, required: true },
      department: { type: String, default: 'it' },
      departmentLabel: { type: String, default: '' },
      experienceLevel: { type: String, default: '' },
      skills: [{ type: String }],
      icon: { type: String, default: '💼' },
    },
    questions: [
      {
        id: { type: String },
        question: { type: String },
        type: { type: String, default: 'Technical' },
        difficulty: { type: String, default: 'Intermediate' },
        department: { type: String },
        expectedKeywords: [{ type: String }],
      },
    ],
    answers: {
      type: Map,
      of: new mongoose.Schema(
        {
          answer: { type: String, default: '' },
          score: { type: Number, default: 0 },
          feedback: { type: mongoose.Schema.Types.Mixed },
          submitted: { type: Boolean, default: false },
        },
        { _id: false }
      ),
      default: {},
    },
    totalQuestions: {
      type: Number,
      default: 10,
    },
    answeredCount: {
      type: Number,
      default: 0,
    },
    averageScore: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed'],
      default: 'in_progress',
    },
  },
  {
    timestamps: true,
  }
);

// Auto-calculate answeredCount and averageScore before saving
interviewSessionSchema.pre('save', function (next) {
  if (this.answers) {
    let totalScore = 0;
    let count = 0;
    for (const [, ans] of this.answers.entries()) {
      if (ans && ans.submitted) {
        count++;
        totalScore += Number(ans.score) || 0;
      }
    }
    this.answeredCount = count;
    this.averageScore = count > 0 ? Number((totalScore / count).toFixed(1)) : 0;
  }
  next();
});

const InterviewSession = mongoose.model(
  'InterviewSession',
  interviewSessionSchema
);
export default InterviewSession;
