import Notification from '../models/Notification.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * @desc    Get all notifications for logged-in user + unread count
 * @route   GET /api/notifications
 * @access  Private
 */
export const getMyNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  const unreadCount = await Notification.countDocuments({
    recipient: req.user._id,
    read: false,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        notifications,
        unreadCount,
      },
      'Notifications retrieved successfully'
    )
  );
});

/**
 * @desc    Mark single notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
export const markNotificationAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { $set: { read: true } },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, notification, 'Notification marked as read'));
});

/**
 * @desc    Mark all user notifications as read
 * @route   PUT /api/notifications/mark-all-read
 * @access  Private
 */
export const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, read: false },
    { $set: { read: true } }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, null, 'All notifications marked as read'));
});

/**
 * @desc    Delete single notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    recipient: req.user._id,
  });

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, 'Notification deleted successfully'));
});

/**
 * @desc    Create a notification (system / internal helper)
 * @route   POST /api/notifications/create
 * @access  Private
 */
export const createNotification = asyncHandler(async (req, res) => {
  const { recipient, title, message, type, link, metadata } = req.body;

  const targetRecipient = recipient || req.user._id;

  const newNotification = await Notification.create({
    recipient: targetRecipient,
    sender: req.user._id,
    title,
    message,
    type: type || 'general',
    link: link || '',
    metadata: metadata || null,
  });

  return res
    .status(201)
    .json(
      new ApiResponse(201, newNotification, 'Notification created successfully')
    );
});
