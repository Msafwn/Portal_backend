import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: 'Security Sentinel',
      trim: true,
    },
    detail: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['success', 'warning', 'danger', 'info'],
      default: 'info',
    },
    severity: {
      type: String,
      enum: ['success', 'warning', 'danger', 'info'],
      default: 'info',
    },
    actor: {
      type: String,
      default: 'System Administrator (Super Admin)',
    },
    actorRole: {
      type: String,
      default: 'admin',
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
    location: {
      type: String,
      default: 'Islamabad, PK',
    },
    device: {
      type: String,
      default: 'Admin Console (Chrome / Windows)',
    },
    status: {
      type: String,
      default: 'Success',
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ category: 1 });
auditLogSchema.index({ type: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
