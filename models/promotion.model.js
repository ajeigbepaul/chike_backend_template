import mongoose from 'mongoose';

const promotionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A promotion must have a name'],
    trim: true,
    unique: true,
  },
  type: {
    type: String,
    required: [true, 'A promotion must have a type'],
    enum: ['percentage', 'fixed_amount'],
  },
  value: {
    type: Number,
    required: [true, 'A promotion must have a value'],
    min: 0,
  },
  startDate: {
    type: Date,
    required: [true, 'A promotion must have a start date'],
  },
  endDate: {
    type: Date,
    required: [true, 'A promotion must have an end date'],
    validate: {
      validator: function (val) {
        return val > this.startDate;
      },
      message: 'End date ({VALUE}) must be after start date',
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  applicableTo: {
    type: String,
    enum: ['all_products'],
    default: 'all_products',
  },
  products: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'Product',
    },
  ],
  categories: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'Category',
    },
  ],
  minimumOrderAmount: {
    type: Number,
    default: 0,
  },
  // maximumDiscountAmount: {
  //   type: Number,
  //   default: null,
  // },
  usageLimit: {
    type: Number,
    default: null,
  },
  usedCount: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient querying by date and status
promotionSchema.index({ startDate: 1, endDate: 1, isActive: 1 });

const Promotion = mongoose.model('Promotion', promotionSchema);

export default Promotion;
