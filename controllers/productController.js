// import Product from '../models/productModel.js';
// import APIFeatures from '../utils/apiFeatures.js';
// import AppError from '../utils/appError.js';
// import catchAsync from '../utils/catchAsync.js';

// export const getAllProducts = catchAsync(async (req, res, next) => {
//   const features = new APIFeatures(Product.find(), req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();

//   const products = await features.query;

//   res.status(200).json({
//     status: 'success',
//     results: products.length,
//     data: {
//       products,
//     },
//   });
// });

// export const getProduct = catchAsync(async (req, res, next) => {
//   const product = await Product.findById(req.params.id).populate('reviews');

//   if (!product) {
//     return next(new AppError('No product found with that ID', 404));
//   }

//   res.status(200).json({
//     status: 'success',
//     data: {
//       product,
//     },
//   });
// });

// export const createProduct = catchAsync(async (req, res, next) => {
//   const newProduct = await Product.create(req.body);

//   res.status(201).json({
//     status: 'success',
//     data: {
//       product: newProduct,
//     },
//   });
// });

// export const updateProduct = catchAsync(async (req, res, next) => {
//   const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
//     new: true,
//     runValidators: true,
//   });

//   if (!product) {
//     return next(new AppError('No product found with that ID', 404));
//   }

//   res.status(200).json({
//     status: 'success',
//     data: {
//       product,
//     },
//   });
// });

// export const deleteProduct = catchAsync(async (req, res, next) => {
//   const product = await Product.findByIdAndDelete(req.params.id);

//   if (!product) {
//     return next(new AppError('No product found with that ID', 404));
//   }

//   res.status(204).json({
//     status: 'success',
//     data: null,
//   });
// });

// export const getProductStats = catchAsync(async (req, res, next) => {
//   const stats = await Product.aggregate([
//     {
//       $match: { ratingsAverage: { $gte: 4.5 } },
//     },
//     {
//       $group: {
//         _id: '$category',
//         numProducts: { $sum: 1 },
//         avgRating: { $avg: '$ratingsAverage' },
//         avgPrice: { $avg: '$price' },
//         minPrice: { $min: '$price' },
//         maxPrice: { $max: '$price' },
//       },
//     },
//     {
//       $sort: { avgPrice: 1 },
//     },
//   ]);

//   res.status(200).json({
//     status: 'success',
//     data: {
//       stats,
//     },
//   });
// });

// export const searchProducts = catchAsync(async (req, res, next) => {
//   const { query } = req.query;

//   if (!query) {
//     return next(new AppError('Please provide a search query', 400));
//   }

//   const products = await Product.find({
//     $text: { $search: query },
//   }).limit(10);

//   res.status(200).json({
//     status: 'success',
//     results: products.length,
//     data: {
//       products,
//     },
//   });
// });

// export const getAutocompleteSuggestions = catchAsync(async (req, res, next) => {
//   const { query } = req.query;

//   if (!query) {
//     return next(new AppError('Please provide a search query', 400));
//   }

//   const suggestions = await Product.aggregate([
//     {
//       $search: {
//         index: 'autocomplete',
//         autocomplete: {
//           query: query,
//           path: 'name',
//           fuzzy: {
//             maxEdits: 2,
//           },
//         },
//       },
//     },
//     {
//       $limit: 5,
//     },
//     {
//       $project: {
//         name: 1,
//         slug: 1,
//         imageCover: 1,
//       },
//     },
//   ]);

//   res.status(200).json({
//     status: 'success',
//     results: suggestions.length,
//     data: {
//       suggestions,
//     },
//   });
// });
// import Product from '../models/Product.js';
import Product from '../models/product.model.js';
import APIFeatures from '../utils/apiFeatures.js';
import AppError  from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import multer from 'multer';
import sharp from 'sharp';

// Configure multer for file uploads
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

export const uploadProductImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 5 }
]);

export const resizeProductImages = catchAsync(async (req, res, next) => {
  if (!req.files) return next();

  // 1) Cover image
  if (req.files.imageCover) {
    req.body.imageCover = `product-${req.params.id || 'new'}-cover-${Date.now()}.jpeg`;
    await sharp(req.files.imageCover[0].buffer)
      .resize(2000, 1333)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(`public/img/products/${req.body.imageCover}`);
  }

  // 2) Images
  if (req.files.images) {
    req.body.images = [];
    await Promise.all(
      req.files.images.map(async (file, i) => {
        const filename = `product-${req.params.id || 'new'}-${Date.now()}-${i + 1}.jpeg`;
        
        await sharp(file.buffer)
          .resize(1000, 667)
          .toFormat('jpeg')
          .jpeg({ quality: 90 })
          .toFile(`public/img/products/${filename}`);

        req.body.images.push(filename);
      })
    );
  }

  next();
});

export const getAllProducts = catchAsync(async (req, res, next) => {
  // To allow for nested GET reviews on product
  let filter = {};
  if (req.params.productId) filter = { product: req.params.productId };

  const features = new APIFeatures(Product.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const products = await features.query;

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: {
      products
    }
  });
});

export const getProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate('reviews');

  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      product
    }
  });
});

export const createProduct = catchAsync(async (req, res, next) => {
  // Add vendor information
  if (!req.body.vendor) req.body.vendor = req.user.id;

  const newProduct = await Product.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      product: newProduct
    }
  });
});

export const updateProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }

  // Check if the user is the vendor or admin
  if (req.user.role !== 'admin' && product.vendor.toString() !== req.user.id.toString()) {
    return next(new AppError('You are not authorized to update this product', 403));
  }

  res.status(200).json({
    status: 'success',
    data: {
      product
    }
  });
});

export const deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }

  // Check if the user is the vendor or admin
  if (req.user.role !== 'admin' && product.vendor.toString() !== req.user.id.toString()) {
    return next(new AppError('You are not authorized to delete this product', 403));
  }

  await product.remove();

  res.status(204).json({
    status: 'success',
    data: null
  });
});

export const getProductStats = catchAsync(async (req, res, next) => {
  const stats = await Product.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        _id: '$category',
        numProducts: { $sum: 1 },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

export const searchProducts = catchAsync(async (req, res, next) => {
  const { query } = req.query;

  if (!query) {
    return next(new AppError('Please provide a search query', 400));
  }

  const products = await Product.find({
    $text: { $search: query }
  }).limit(10);

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: {
      products
    }
  });
});

export const getAutocompleteSuggestions = catchAsync(async (req, res, next) => {
  const { query } = req.query;

  if (!query) {
    return next(new AppError('Please provide a search query', 400));
  }

  const suggestions = await Product.aggregate([
    {
      $search: {
        index: 'autocomplete',
        autocomplete: {
          query: query,
          path: 'name',
          fuzzy: {
            maxEdits: 2
          }
        }
      }
    },
    {
      $limit: 5
    },
    {
      $project: {
        name: 1,
        slug: 1,
        imageCover: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    results: suggestions.length,
    data: {
      suggestions
    }
  });
});