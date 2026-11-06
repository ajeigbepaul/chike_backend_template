import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  quote: { type: mongoose.Schema.Types.ObjectId, ref: 'Quote' },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorInvitation' },
  type: { type: String, enum: ['order', 'quote', 'vendor'], default: 'order' },
  status: { type: String, required: true },
  message: { type: String },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification; 