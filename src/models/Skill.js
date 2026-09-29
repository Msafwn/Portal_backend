import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Skill name is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    category: {
      type: String,
      required: [true, 'Skill category is required'],
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
    demandLevel: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'Medium',
    },
  },
  {
    timestamps: true,
  }
);

skillSchema.index({ name: 1 }, { unique: true });
skillSchema.index({ category: 1 });

const Skill = mongoose.model('Skill', skillSchema);

export default Skill;
