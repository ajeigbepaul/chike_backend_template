import Promotion from '../models/promotion.model.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

export const getAllPromotions = catchAsync(async (req, res, next) => {
  const promotions = await Promotion.find();

  res.status(200).json({
    status: 'success',
    results: promotions.length,
    data: {
      promotions,
    },
  });
});

export const getPromotion = catchAsync(async (req, res, next) => {
  const promotion = await Promotion.findById(req.params.id)
    .populate('products')
    .populate('categories');

  if (!promotion) {
    return next(new AppError('No promotion found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      promotion,
    },
  });
});

export const createPromotion = catchAsync(async (req, res, next) => {
  const newPromotion = await Promotion.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      promotion: newPromotion,
    },
  });
});

export const updatePromotion = catchAsync(async (req, res, next) => {
  const promotion = await Promotion.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!promotion) {
    return next(new AppError('No promotion found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      promotion,
    },
  });
});

export const deletePromotion = catchAsync(async (req, res, next) => {
  const promotion = await Promotion.findByIdAndDelete(req.params.id);

  if (!promotion) {
    return next(new AppError('No promotion found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
