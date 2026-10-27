import mongoose from 'mongoose';

const securityAlertSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: 'Security Threat',
      trim: true,
    },
    severity: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      default: 'Medium',
    },
    score: {
      type: Number,
      default: 75,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    target: {
      type: String,
      default: 'Auth Gateway',
      trim: true,
    },
    ipAddress: {
      type: String,
      default: '192.168.1.1',
    },
    location: {
      type: String,
      default: 'Islamabad, PK',
    },
    recommendedAction: {
      type: String,
      default: 'Inspect IP and verify credential integrity',
    },
    status: {
      type: String,
      enum: ['Active Threat', 'Mitigated / Resolved', 'Blocked'],
      default: 'Active Threat',
    },
    detectedAt: {
      type: String,
      default: 'Recently',
    },
    resolvedAt: {
      type: String,
    },
    resolutionNote: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

securityAlertSchema.index({ createdAt: -1 });
securityAlertSchema.index({ status: 1 });
securityAlertSchema.index({ severity: 1 });

const SecurityAlert = mongoose.model('SecurityAlert', securityAlertSchema);

export default SecurityAlert;
