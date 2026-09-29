import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'Frontend',
        'Backend',
        'Database',
        'Mobile Development',
        'DevOps & Cloud',
        'Data Science & AI',
        'Quality Assurance',
        'UI/UX Design',
        'Soft Skills & Management',
        'Other',
      ],
      default: 'Other',
    },
    aliases: {
      type: [String],
      default: [],
    },
    learningResources: [
      {
        title: { type: String },
        platform: { type: String },
        url: { type: String },
        type: {
          type: String,
          enum: ['Course', 'Documentation', 'Tutorial', 'Roadmap'],
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

skillSchema.index({ name: 'text', aliases: 'text' });

const Skill = mongoose.model('Skill', skillSchema);

export default Skill;
