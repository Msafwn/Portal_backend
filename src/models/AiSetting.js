import mongoose from 'mongoose';

const aiSettingSchema = new mongoose.Schema(
  {
    skillWeight: {
      type: Number,
      required: true,
      default: 50,
      min: 0,
      max: 100,
    },
    experienceWeight: {
      type: Number,
      required: true,
      default: 30,
      min: 0,
      max: 100,
    },
    educationWeight: {
      type: Number,
      required: true,
      default: 20,
      min: 0,
      max: 100,
    },
    minMatchThreshold: {
      type: Number,
      default: 45,
      min: 0,
      max: 100,
    },
    vectorEmbeddingModel: {
      type: String,
      default: 'all-MiniLM-L6-v2 (384-dimensional dense vectors)',
    },
    similarityMetric: {
      type: String,
      default: 'Normalized Cosine Similarity + TF-IDF Keyword Hybrid',
    },
    calibrationVersion: {
      type: String,
      default: 'v2.4-Production-Arid-FYP',
    },
    activePresetName: {
      type: String,
      default: 'Official FYP Proposal Standard (50 / 30 / 20)',
    },
    lastCalibrated: {
      type: String,
      default: 'Apr 05, 2026 • 22:30 PKT',
    },
  },
  {
    timestamps: true,
  }
);

const AiSetting = mongoose.model('AiSetting', aiSettingSchema);

export default AiSetting;
