import Notification from '../models/Notification.js';
import { emitNotificationToUser, emitNotificationToRole } from '../socket.js';

/**
 * Creates notification in database and emits in real-time via WebSocket
 */
export const createAndSendNotification = async ({
  recipient,
  sender = null,
  title,
  message,
  type = 'general',
  link = '',
  metadata = null,
  role = null,
}) => {
  try {
    const notification = await Notification.create({
      recipient,
      sender,
      title,
      message,
      type,
      link,
      metadata,
    });

    // Emit in real-time to recipient's private WebSocket room
    if (recipient) {
      emitNotificationToUser(recipient.toString(), notification);
    }

    // Also broadcast to role room if specified (e.g. 'admin')
    if (role) {
      emitNotificationToRole(role, notification);
    }

    return notification;
  } catch (err) {
    console.error('⚠️ [Notification Helper] Failed to create or emit notification:', err.message);
    return null;
  }
};

