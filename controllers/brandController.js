import Brand from '../models/brand.model.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import APIFeatures from '../utils/apiFeatures.js';

// Get all brands
export const getAllBrands = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Brand.find(), req.query)
    .sort();

  const brands = await features.query;

  res.status(200).json({
    status: 'success',
    results: brands.length,
    data: {
      brands
    }
  });
});

// Create brand - Admin only
export const createBrand = catchAsync(async (req, res, next) => {
  const { name } = req.body;
  if (!name) {
    return next(new AppError('Please provide a brand name', 400));
  }
  const brand = await Brand.create({ name });

  res.status(201).json({
    status: 'success',
    data: {
      brand
    }
  });
});

// Update brand - Admin only
export const updateBrand = catchAsync(async (req, res, next) => {
  const { name } = req.body;
  const brand = await Brand.findByIdAndUpdate(req.params.id, { name }, {
    new: true,
    runValidators: true
  });

  if (!brand) {
    return next(new AppError('No brand found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      brand
    }
  });
});

// Delete brand - Admin only
export const deleteBrand = catchAsync(async (req, res, next) => {
  const brand = await Brand.findByIdAndDelete(req.params.id);

  if (!brand) {
    return next(new AppError('No brand found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
}); 