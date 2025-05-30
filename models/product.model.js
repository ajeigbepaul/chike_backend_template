import mongoose from 'mongoose';
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A product must have a name'],
    trim: true,
    maxlength: [100, 'A product name must have less or equal than 100 characters'],
    minlength: [10, 'A product name must have more or equal than 10 characters'],
  },
  slug: String,
  description: {
    type: String,
    required: [true, 'A product must have a description'],
    trim: true,
  },
  summary: {
    type: String,
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'A product must have a price'],
    min: [0, 'Price must be above 0'],
  },
  priceDiscount: {
    type: Number,
    validate: {
      validator: function (val) {
        return val < this.price;
      },
      message: 'Discount price ({VALUE}) should be below regular price',
    },
  },
  category: {
    type: mongoose.Schema.ObjectId,
    ref: 'Category',
    required: [true, 'A product must belong to a category'],
  },
  subCategories: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'SubCategory',
    },
  ],
  quantity: {
    type: Number,
    required: [true, 'A product must have a quantity'],
    min: [0, 'Quantity must be above 0'],
  },
  sold: {
    type: Number,
    default: 0,
  },
  images: [String],
  imageCover: {
    type: String,
    required: [true, 'A product must have a cover image'],
  },
  colors: [String],
  sizes: [String],
  ratingsAverage: {
    type: Number,
    default: 4.5,
    min: [1, 'Rating must be above 1.0'],
    max: [5, 'Rating must be below 5.0'],
    set: (val) => Math.round(val * 10) / 10,
  },
  ratingsQuantity: {
    type: Number,
    default: 0,
  },
  brand: {
    type: mongoose.Schema.ObjectId,
    ref: 'Brand',
  },
  vendor: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  },
  features: [String],
  specifications: [
    {
      key: String,
      value: String,
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  isBulk: {
    type: Boolean,
    default: false,
  },
  minBulkQuantity: {
    type: Number,
    default: 10,
  },
  bulkDiscountPercentage: {
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
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual populate reviews
productSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'product',
  localField: '_id',
});

// Indexes for better performance
productSchema.index({ price: 1, ratingsAverage: -1 });
productSchema.index({ slug: 1 });
productSchema.index({ name: 'text', description: 'text' });

const Product = mongoose.model('Product', productSchema);
export default Product;
