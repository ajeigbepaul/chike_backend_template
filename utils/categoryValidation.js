import AppError from './AppError.js';

export const validateCategoryName = (name) => {
  // Check for special characters
  if (/[<>{}[\]\\^~]/.test(name)) {
    throw new AppError('Category name cannot contain special characters', 400);
  }

  // Check for consecutive spaces
  if (/\s{2,}/.test(name)) {
    throw new AppError('Category name cannot contain consecutive spaces', 400);
  }

  // Check for leading/trailing spaces
  if (name.trim() !== name) {
    throw new AppError('Category name cannot have leading or trailing spaces', 400);
  }

  return true;
};

export const validateCategoryPath = (path) => {
  // Check for valid path format
  if (!/^[a-zA-Z0-9\s\-&]+(\/[a-zA-Z0-9\s\-&]+)*$/.test(path)) {
    throw new AppError('Invalid category path format', 400);
  }

  return true;
};

export const validateCategoryLevel = (level, parentLevel) => {
  if (level > 3) {
    throw new AppError('Category cannot exceed level 3', 400);
  }

  if (parentLevel && level !== parentLevel + 1) {
    throw new AppError('Invalid category level', 400);
  }

  return true;
}; 