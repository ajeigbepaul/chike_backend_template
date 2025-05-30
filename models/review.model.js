import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty'],
      trim: true,
      maxlength: [500, 'Review must be less than 500 characters']
    },
    rating: {
      type: Number,
      required: [true, 'A review must have a rating'],
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    product: {
      type: mongoose.Schema.ObjectId,
      ref: 'Product',
      required: [true, 'Review must belong to a product']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user']
    },
    reports: [
      {
        user: {
          type: mongoose.Schema.ObjectId,
          ref: 'User'
        },
        reason: {
          type: String,
          enum: [
            'spam',
            'inappropriate',
            'false_information',
            'hate_speech',
            'other'
          ],
          required: [true, 'Please provide a reason for reporting']
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    isActive: {
      type: Boolean,
      default: true,
      select: false
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Prevent duplicate reviews from the same user on the same product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Populate user and product when querying reviews
reviewSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'name photo'
  }).populate({
    path: 'product',
    select: 'name'
  });
  next();
});

// Only show active reviews (not deleted or hidden)
reviewSchema.pre(/^find/, function(next) {
  this.find({ isActive: { $ne: false } });
  next();
});

const Review = mongoose.model('Review', reviewSchema);

export default Review;