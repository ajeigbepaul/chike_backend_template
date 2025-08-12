import mongoose from 'mongoose';

const quoteSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Product',
    required: [true, 'A quote must be for a product'],
  },
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
  },
  customerEmail: {
    type: String,
    required: [true, 'Customer email is required'],
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address',
    ],
  },
  customerPhone: {
    type: String,
    trim: true,
  },
  company: {
    type: String,
    trim: true,
  },
  message: {
    type: String,
    trim: true,
  },
  expectedPrice: {
    type: Number,
    min: [0, 'Expected price must be above 0'],
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['pending', 'responded', 'accepted', 'rejected'],
    default: 'pending',
  },
  responseMessage: {
    type: String,
    trim: true,
  },
  image: {
    type: String,
  },
  approvedPrice: {
    type: Number,
    min: [0, 'Approved price must be a positive number'],
  },
  approvedQuantity: {
    type: Number,
    min: [1, 'Approved quantity must be at least 1'],
  },
  respondedAt: {
    type: Date,
  },
  respondedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for better performance
quoteSchema.index({ productId: 1 });
quoteSchema.index({ customerEmail: 1 });
quoteSchema.index({ status: 1 });
quoteSchema.index({ urgency: 1 });
quoteSchema.index({ createdAt: -1 });

// Update the updatedAt field on save
quoteSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Set respondedAt when status changes from pending to responded
  if (this.isModified('status') && this.status === 'responded' && !this.respondedAt) {
    this.respondedAt = Date.now();
  }
  
  next();
});

const Quote = mongoose.model('Quote', quoteSchema);
export default Quote;
