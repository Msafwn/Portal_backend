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
      default: 'Computer Science & IT',
    },
    aliases: {
      type: [String],
      default: [],
    },
    demandLevel: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'High',
    },
    weightMultiplier: {
      type: Number,
      default: 1.0,
      min: 0.5,
      max: 3.0,
    },
    popularity: {
      type: Number,
      default: 85,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

skillSchema.index({ category: 1 });
skillSchema.index({ aliases: 1 });
skillSchema.index({ name: 'text', aliases: 'text' });

const Skill = mongoose.model('Skill', skillSchema);

export default Skill;
