// import Product from '../models/Product.js';
import Product from "../models/product.model.js";
import APIFeatures from "../utils/apiFeatures.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import multer from "multer";
import cloudinary from "../utils/cloudinary.js";
import Order from "../models/order.model.js";
import { Vendor } from "../models/vendor.model.js";
import crypto from "crypto";

// Configure multer for file uploads
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image! Please upload only images.", 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

export const uploadProductImages = upload.fields([
  { name: "imageCover", maxCount: 1 },
  { name: "images", maxCount: 5 },
]);

export const resizeProductImages = catchAsync(async (req, res, next) => {
  if (!req.files) return next();

  // 1) Cover image
  if (req.files.imageCover) {
    const result = await cloudinary.uploader.upload(
      `data:${
        req.files.imageCover[0].mimetype
      };base64,${req.files.imageCover[0].buffer.toString("base64")}`,
      {
        folder: "chike",
        transformation: [
          { width: 2000, height: 1333, crop: "fill" },
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
      }
    );
    req.body.imageCover = result.secure_url;
  }

  // 2) Images
  if (req.files.images) {
    req.body.images = [];
    await Promise.all(
      req.files.images.map(async (file) => {
        const result = await cloudinary.uploader.upload(
          `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
          {
            folder: "chike",
            transformation: [
              { width: 1000, height: 667, crop: "fill" },
              { quality: "auto" },
              { fetch_format: "auto" },
            ],
          }
        );
        req.body.images.push(result.secure_url);
      })
    );
  }

  next();
});

export const getAllProducts = catchAsync(async (req, res, next) => {
  let filter = {};
  if (req.params.productId) filter = { product: req.params.productId };

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Get total count for pagination
  const total = await Product.countDocuments(filter);

  // Use aggregation to join reviews, categories, and vendors
  const products = await Product.aggregate([
    { $match: filter },
    {
      $lookup: {
        from: "reviews",
        localField: "_id",
        foreignField: "product",
        as: "reviews",
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "categoryData",
      },
    },
    {
      $lookup: {
        from: "vendors",
        localField: "vendor",
        foreignField: "user",
        as: "vendorData",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "vendor",
        foreignField: "_id",
        as: "userData",
      },
    },
    {
      $addFields: {
        rating: { $avg: "$reviews.rating" },
        reviewsCount: { $size: "$reviews" },
        categoryName: { $arrayElemAt: ["$categoryData.name", 0] },
        vendorName: {
          $cond: {
            if: { $gt: [{ $size: "$vendorData" }, 0] },
            then: {
              $ifNull: [
                { $arrayElemAt: ["$vendorData.businessName", 0] },
                { $arrayElemAt: ["$userData.name", 0] },
              ],
            },
            else: { $arrayElemAt: ["$userData.name", 0] },
          },
        },
      },
    },
    { $skip: skip },
    { $limit: limit },
  ]);

  res.status(200).json({
    status: "success",
    results: products.length,
    data: {
      products,
    },
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
});

export const getProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id)
    .populate("reviews")
    .populate("brand")
    .populate("category");

  if (!product) {
    return next(new AppError("No product found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      product,
    },
  });
});

function generateSerialNumber() {
  return "Chi" + crypto.randomBytes(5).toString("hex").toUpperCase();
}

export const createProduct = catchAsync(async (req, res, next) => {
  // Add vendor information
  if (!req.body.vendor) {
    // If admin, ensure they have a vendor record
    if (req.user.role === "admin") {
      let vendor = await Vendor.findOne({ user: req.user.id });
      if (!vendor) {
        vendor = await Vendor.create({
          user: req.user.id,
          businessName: req.user.name,
          status: "active",
          joinedDate: new Date(),
        });
        console.log(`Created new vendor for admin: ${vendor._id}`);
      }
      req.body.vendor = req.user.id; // Always store user ID, not vendor ID
    } else {
      req.body.vendor = req.user.id;
    }
  } else {
    // If vendor is provided, ensure it's a User ID, not Vendor ID
    const vendorDoc = await Vendor.findById(req.body.vendor);
    if (vendorDoc) {
      // If a Vendor ID was provided, convert it to User ID
      const originalVendorId = req.body.vendor;
      req.body.vendor = vendorDoc.user;
      console.log(
        `Converted Vendor ID ${originalVendorId} to User ID ${vendorDoc.user}`
      );
    } else {
      // If no vendor document found, assume it's already a User ID
      console.log(
        `Vendor document not found for ID: ${req.body.vendor}, assuming it's a User ID`
      );
    }
  }

  // Validate that vendor field is a valid User ID
  if (!req.body.vendor) {
    return next(new AppError("Vendor information is required", 400));
  }

  console.log(`Creating product with vendor (User ID): ${req.body.vendor}`);

  // Always generate a unique serialNumber
  req.body.serialNumber = generateSerialNumber();

  const newProduct = await Product.create(req.body);

  res.status(201).json({
    status: "success",
    data: {
      product: newProduct,
    },
  });
});

export const updateProduct = catchAsync(async (req, res, next) => {
  // Prevent serialNumber from being updated
  if (req.body.serialNumber) {
    delete req.body.serialNumber;
  }
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!product) {
    return next(new AppError("No product found with that ID", 404));
  }

  // Check if the user is the vendor or admin
  if (
    req.user.role !== "admin" &&
    product.vendor.toString() !== req.user.id.toString()
  ) {
    return next(
      new AppError("You are not authorized to update this product", 403)
    );
  }

  res.status(200).json({
    status: "success",
    data: {
      product,
    },
  });
});

export const deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError("No product found with that ID", 404));
  }

  // Check if the user is the vendor or admin
  if (
    req.user.role !== "admin" &&
    product.vendor.toString() !== req.user.id.toString()
  ) {
    return next(
      new AppError("You are not authorized to delete this product", 403)
    );
  }

  await product.remove();

  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const getProductStats = catchAsync(async (req, res, next) => {
  const stats = await Product.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: "$category",
        numProducts: { $sum: 1 },
        avgRating: { $avg: "$ratingsAverage" },
        avgPrice: { $avg: "$price" },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: {
      stats,
    },
  });
});

export const searchProducts = catchAsync(async (req, res, next) => {
  const { query } = req.query;

  if (!query) {
    return next(new AppError("Please provide a search query", 400));
  }

  const products = await Product.find({
    $text: { $search: query },
  }).limit(10);

  res.status(200).json({
    status: "success",
    results: products.length,
    data: {
      products,
    },
  });
});

export const getAutocompleteSuggestions = catchAsync(async (req, res, next) => {
  const { query } = req.query;

  if (!query) {
    return next(new AppError("Please provide a search query", 400));
  }

  const suggestions = await Product.aggregate([
    {
      $search: {
        index: "autocomplete",
        autocomplete: {
          query: query,
          path: "name",
          fuzzy: {
            maxEdits: 2,
          },
        },
      },
    },
    { $limit: 5 },
    // Lookup category
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "categoryObj",
      },
    },
    // Lookup brand
    {
      $lookup: {
        from: "brands",
        localField: "brand",
        foreignField: "_id",
        as: "brandObj",
      },
    },
    {
      $project: {
        name: 1,
        slug: 1,
        imageCover: 1,
        category: { $arrayElemAt: ["$categoryObj.name", 0] },
        brand: { $arrayElemAt: ["$brandObj.name", 0] },
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    results: suggestions.length,
    data: {
      suggestions,
    },
  });
});

export const getRelatedProducts = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const currentProduct = await Product.findById(id);
  if (!currentProduct)
    return next(new AppError("No product found with that ID", 404));

  const related = await Product.find({
    category: currentProduct.category,
    _id: { $ne: id },
  })
    .limit(8)
    .populate("brand");

  res.status(200).json({
    status: "success",
    data: related,
  });
});

export const getMostOrderedProducts = async (req, res, next) => {
  const topProducts = await Order.aggregate([
    // Only include orderItems with valid ObjectId products
    { $unwind: "$orderItems" },
    { $match: { "orderItems.product": { $type: "objectId" } } },
    {
      $group: {
        _id: "$orderItems.product",
        totalSold: { $sum: "$orderItems.quantity" },
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: 8 },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $replaceRoot: {
        newRoot: { $mergeObjects: ["$product", { totalSold: "$totalSold" }] },
      },
    },
  ]);
  res.status(200).json({
    status: "success",
    data: { products: topProducts },
  });
};
