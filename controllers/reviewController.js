import Review from '../models/review.model.js';
import Product from '../models/product.model.js';
import Order from '../models/order.model.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';

const checkPurchase = async (userId, productId) => {
  return await Order.exists({
    user: userId,
    'orderItems.product': productId,
    status: 'delivered'
  });
};

export const getAllReviews = catchAsync(async (req, res, next) => {
  const reviews = await Review.find();

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews
    }
  });
});

export const getReviewsForProduct = catchAsync(async (req, res, next) => {
  const reviews = await Review.find({ product: req.params.productId });

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews
    }
  });
});

export const getMyReviews = catchAsync(async (req, res, next) => {
  const reviews = await Review.find({ user: req.user.id });

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews
    }
  });
});

export const getReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new AppError('No review found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      review
    }
  });
});

export const createReview = catchAsync(async (req, res, next) => {
  // Allow nested routes
  if (!req.body.product) req.body.product = req.params.productId;
  if (!req.body.user) req.body.user = req.user.id;

  // Check if user has purchased the product
  const hasPurchased = await checkPurchase(req.user.id, req.body.product);
  if (!hasPurchased) {
    return next(
      new AppError('You can only review products you have purchased', 400)
    );
  }

  // Check for existing review
  const existingReview = await Review.findOne({
    user: req.user.id,
    product: req.body.product
  });
  if (existingReview) {
    return next(new AppError('You have already reviewed this product', 400));
  }

  const newReview = await Review.create(req.body);

  // Update product ratings
  await updateProductRatings(req.body.product);

  res.status(201).json({
    status: 'success',
    data: {
      review: newReview
    }
  });
});

export const updateReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new AppError('No review found with that ID', 404));
  }

  // Check if review belongs to user or user is admin
  if (
    review.user.toString() !== req.user.id.toString() &&
    req.user.role !== 'admin'
  ) {
    return next(new AppError('You are not authorized to update this review', 403));
  }

  review.review = req.body.review || review.review;
  review.rating = req.body.rating || review.rating;

  const updatedReview = await review.save();

  // Update product ratings
  await updateProductRatings(review.product);

  res.status(200).json({
    status: 'success',
    data: {
      review: updatedReview
    }
  });
});

export const deleteReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new AppError('No review found with that ID', 404));
  }

  // Check if review belongs to user or user is admin
  if (
    review.user.toString() !== req.user.id.toString() &&
    req.user.role !== 'admin'
  ) {
    return next(new AppError('You are not authorized to delete this review', 403));
  }

  // Soft delete (set isActive to false)
  review.isActive = false;
  await review.save();

  // Update product ratings
  await updateProductRatings(review.product);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

export const reportReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new AppError('No review found with that ID', 404));
  }

  // Check if user has already reported this review
  if (review.reports.some(report => report.user.toString() === req.user.id.toString())) {
    return next(new AppError('You have already reported this review', 400));
  }

  review.reports.push({
    user: req.user.id,
    reason: req.body.reason
  });

  // Auto-hide review if it reaches 5 reports
  if (review.reports.length >= 5) {
    review.isActive = false;
  }

  await review.save();

  res.status(200).json({
    status: 'success',
    data: {
      review
    }
  });
});

const updateProductRatings = async productId => {
  const stats = await Review.aggregate([
    {
      $match: { product: productId, isActive: { $ne: false } }
    },
    {
      $group: {
        _id: '$product',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};