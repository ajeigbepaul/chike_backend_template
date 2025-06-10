import Category from '../models/category.model.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import { validateCategoryName, validateCategoryPath, validateCategoryLevel } from '../utils/categoryValidation.js';
import { Parser } from 'json2csv';

export const getAllCategories = catchAsync(async (req, res, next) => {
  const categories = await Category.find()
    .sort('order');
  
  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: {
      categories
    }
  });
});

export const getCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(new AppError('No category found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      category
    }
  });
});

export const createCategory = catchAsync(async (req, res, next) => {
  const { name, parent, order } = req.body;

  // Validate category name
  validateCategoryName(name);

  // If parent is provided, validate level
  if (parent) {
    const parentCategory = await Category.findById(parent);
    if (!parentCategory) {
      return next(new AppError('Parent category not found', 404));
    }
    validateCategoryLevel(parentCategory.level + 1, parentCategory.level);
  }

  const category = await Category.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      category
    }
  });
});

export const updateCategory = catchAsync(async (req, res, next) => {
  const { name, parent, order } = req.body;

  if (name) {
    validateCategoryName(name);
  }

  if (parent) {
    const parentCategory = await Category.findById(parent);
    if (!parentCategory) {
      return next(new AppError('Parent category not found', 404));
    }
    validateCategoryLevel(parentCategory.level + 1, parentCategory.level);
  }

  const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!category) {
    return next(new AppError('No category found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      category
    }
  });
});

export const deleteCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(new AppError('No category found with that ID', 404));
  }

  // Find all descendant categories (subcategories of this category)
  const descendants = await Category.find({ ancestors: category._id });
  const descendantIds = descendants.map(desc => desc._id);

  // Delete all descendants and the category itself
  // Use $in to delete multiple documents efficiently
  await Category.deleteMany({ _id: { $in: [category._id, ...descendantIds] } });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

export const reorderCategories = catchAsync(async (req, res, next) => {
  const { orders } = req.body; // Array of { id, order } objects

  if (!Array.isArray(orders)) {
    return next(new AppError('Invalid order data', 400));
  }

  const updatePromises = orders.map(({ id, order }) =>
    Category.findByIdAndUpdate(id, { order }, { new: true })
  );

  await Promise.all(updatePromises);

  res.status(200).json({
    status: 'success',
    message: 'Categories reordered successfully'
  });
});

export const exportCategories = catchAsync(async (req, res, next) => {
  const categories = await Category.find().sort('order');
  
  const fields = ['name', 'path', 'level', 'order', 'isActive'];
  const json2csvParser = new Parser({ fields });
  const csv = json2csvParser.parse(categories);

  res.header('Content-Type', 'text/csv');
  res.attachment('categories.csv');
  return res.send(csv);
});

export const importCategories = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload a CSV file', 400));
  }

  const csvData = req.file.buffer.toString();
  const categories = csvData.split('\n').map(line => {
    const [name, path, level, order, isActive] = line.split(',');
    return {
      name: name.trim(),
      path: path.trim(),
      level: parseInt(level),
      order: parseInt(order),
      isActive: isActive.trim().toLowerCase() === 'true'
    };
  });

  // Validate all categories before importing
  for (const category of categories) {
    validateCategoryName(category.name);
    validateCategoryPath(category.path);
    validateCategoryLevel(category.level);
  }

  // Import categories
  await Category.insertMany(categories);

  res.status(200).json({
    status: 'success',
    message: 'Categories imported successfully'
  });
}); 