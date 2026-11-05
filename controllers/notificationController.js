import Notification from '../models/notification.model.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';

export const getNotifications = catchAsync(async (req, res, next) => {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 });
  res.status(200).json({
    status: 'success',
    data: { notifications },
  });
});

export const getUnreadCount = catchAsync(async (req, res, next) => {
  const filter = { user: req.user._id, read: false };
  if (req.query.type === "order") {
    filter.$or = [
      { type: "order" },
      { type: { $exists: false } },
      { order: { $exists: true, $ne: null } },
    ];
  } else if (req.query.type === "quote") {
    filter.$or = [
      { type: "quote" },
      { quote: { $exists: true, $ne: null } },
    ];
  } else if (req.query.type) {
    filter.type = req.query.type;
  }
  const count = await Notification.countDocuments(filter);
  res.status(200).json({
    status: 'success',
    data: { count },
  });
});

export const markAsRead = catchAsync(async (req, res, next) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  );
  if (!notification) {
    return next(new AppError('Notification not found', 404));
  }
  res.status(200).json({
    status: 'success',
    data: { notification },
  });
}); 