import User from '../models/user.model.js'; // Adjust the import path as necessary
import AppError  from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import APIFeatures from '../utils/apiFeatures.js';
import multer from 'multer';
import cloudinary from '../utils/cloudinary.js';

// Multer configuration for file upload
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

export const uploadUserPhoto = upload.single('photo');

export const resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  const result = await cloudinary.uploader.upload(
    `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
    {
      folder: 'chike',
      transformation: [
        { width: 500, height: 500, crop: 'fill' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    }
  );

  req.body.photo = result.secure_url;
  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// User CRUD Operations
export const getAllUsers = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(User.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const users = await features.query;

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users
    }
  });
});

export const getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

export const updateUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

export const deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// User Profile Operations
export const getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

export const updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /update-password.',
        400
      )
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email', 'phone');
  if (req.file) filteredBody.photo = req.file.filename;

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

export const deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Wishlist Operations
export const getWishlist = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate('wishlist');

  res.status(200).json({
    status: 'success',
    results: user.wishlist.length,
    data: {
      wishlist: user.wishlist
    }
  });
});

export const addToWishlist = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $addToSet: { wishlist: req.params.productId } },
    { new: true }
  ).populate('wishlist');

  res.status(200).json({
    status: 'success',
    data: {
      wishlist: user.wishlist
    }
  });
});

export const removeFromWishlist = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $pull: { wishlist: req.params.productId } },
    { new: true }
  ).populate('wishlist');

  res.status(200).json({
    status: 'success',
    data: {
      wishlist: user.wishlist
    }
  });
});

// Address Operations
export const getAddresses = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    status: 'success',
    results: user.addresses.length,
    data: {
      addresses: user.addresses
    }
  });
});

export const addAddress = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $push: { addresses: req.body } },
    { new: true }
  );

  res.status(200).json({
    status: 'success',
    data: {
      addresses: user.addresses
    }
  });
});

export const updateAddress = catchAsync(async (req, res, next) => {
  const user = await User.findOneAndUpdate(
    { _id: req.user.id, 'addresses._id': req.params.addressId },
    {
      $set: {
        'addresses.$': req.body
      }
    },
    { new: true }
  );

  res.status(200).json({
    status: 'success',
    data: {
      addresses: user.addresses
    }
  });
});

export const removeAddress = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $pull: { addresses: { _id: req.params.addressId } } },
    { new: true }
  );

  res.status(200).json({
    status: 'success',
    data: {
      addresses: user.addresses
    }
  });
});

export const setDefaultAddress = catchAsync(async (req, res, next) => {
  // First reset all addresses to non-default
  await User.updateMany(
    { _id: req.user.id },
    { $set: { 'addresses.$[].isDefault': false } }
  );

  // Then set the selected address as default
  const user = await User.findOneAndUpdate(
    { _id: req.user.id, 'addresses._id': req.params.addressId },
    {
      $set: {
        'addresses.$.isDefault': true
      }
    },
    { new: true }
  );

  res.status(200).json({
    status: 'success',
    data: {
      addresses: user.addresses
    }
  });
});