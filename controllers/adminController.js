import { promisify } from "util";
import mongoose from "mongoose";
import crypto from "crypto";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Review from "../models/Review.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import { parseExcel, generateExcel } from "../utils/excelHandler.js";
import { sendVendorInvitation } from "../services/emailService.js";

// Dashboard Overview
export const getDashboardStats = catchAsync(async (req, res, next) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Execute all queries in parallel
  const [
    todaySales,
    pendingOrders,
    lowStockProducts,
    totalOrders,
    totalRevenue,
    activeUsers,
    newSignups,
    abandonedCarts,
  ] = await Promise.all([
    // Today's sales
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: today },
          isPaid: true,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalPrice" },
          count: { $sum: 1 },
        },
      },
    ]),

    // Pending orders
    Order.countDocuments({ status: "processing" }),

    // Low stock products
    Product.countDocuments({ quantity: { $lt: 10 } }),

    // Total orders (last 30 days)
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          revenue: { $sum: "$totalPrice" },
        },
      },
    ]),

    // Active users (ordered in last 30 days)
    Order.distinct("user", {
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    }),

    // New signups (last 7 days)
    User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }),

    // Abandoned carts (created but not paid in last 7 days)
    Order.countDocuments({
      isPaid: false,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }),
  ]);

  // Sales by region
  const salesByRegion = await Order.aggregate([
    {
      $match: {
        isPaid: true,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    },
    {
      $group: {
        _id: { $eq: ["$shippingAddress.country", "YourCountry"] },
        totalSales: { $sum: "$totalPrice" },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        region: {
          $cond: { if: "$_id", then: "Local", else: "International" },
        },
        totalSales: 1,
        count: 1,
        _id: 0,
      },
    },
  ]);

  // Top selling products
  const topProducts = await Order.aggregate([
    {
      $match: {
        isPaid: true,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    },
    { $unwind: "$orderItems" },
    {
      $group: {
        _id: "$orderItems.product",
        totalSold: { $sum: "$orderItems.quantity" },
        totalRevenue: {
          $sum: { $multiply: ["$orderItems.quantity", "$orderItems.price"] },
        },
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: 5 },
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
      $project: {
        name: "$product.name",
        image: "$product.imageCover",
        totalSold: 1,
        totalRevenue: 1,
      },
    },
  ]);

  // Conversion rate calculation
  const ordersCount = totalOrders[0]?.count || 0;
  const sessions = await getSessionsCount(); // Implement your analytics tracking
  const conversionRate = sessions > 0 ? (ordersCount / sessions) * 100 : 0;

  res.status(200).json({
    status: "success",
    data: {
      todaySales: todaySales[0] || { total: 0, count: 0 },
      pendingOrders,
      lowStockProducts,
      totalOrders: totalOrders[0] || { count: 0, revenue: 0 },
      activeUsers: activeUsers.length,
      salesByRegion,
      topProducts,
      newSignups,
      abandonedCarts,
      conversionRate: conversionRate.toFixed(2),
    },
  });
});

// Product Management
export const bulkImportProducts = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError("Please upload an Excel file", 400));
  }

  const data = await parseExcel(req.file.buffer);

  // Validate required fields
  const requiredFields = ["name", "price", "quantity", "category"];
  const missingFields = requiredFields.filter(
    (field) => !data[0] || !data[0].hasOwnProperty(field)
  );

  if (missingFields.length > 0) {
    return next(
      new AppError(`Missing required fields: ${missingFields.join(", ")}`, 400)
    );
  }

  // Transform data and insert
  const products = data.map((item) => ({
    name: item.name,
    description: item.description || "",
    price: item.price,
    quantity: item.quantity,
    category: item.category,
    subCategories: item.subCategories ? item.subCategories.split(",") : [],
    vendor: req.user.id,
    createdAt: new Date(),
  }));

  await Product.insertMany(products);

  res.status(201).json({
    status: "success",
    message: `${products.length} products imported successfully`,
  });
});

export const bulkExportProducts = catchAsync(async (req, res, next) => {
  const products = await Product.find().lean();

  const data = products.map((product) => ({
    name: product.name,
    description: product.description,
    price: product.price,
    quantity: product.quantity,
    category: product.category,
    subCategories: product.subCategories.join(","),
    ratingsAverage: product.ratingsAverage,
    ratingsQuantity: product.ratingsQuantity,
  }));

  const buffer = await generateExcel(data, "Products");

  res.set({
    "Content-Type":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": "attachment; filename=products_export.xlsx",
  });

  res.send(buffer);
});

// Order Management
export const updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const validStatuses = ["processing", "shipped", "delivered", "cancelled"];

  if (!validStatuses.includes(status)) {
    return next(new AppError("Invalid order status", 400));
  }

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );

  if (!order) {
    return next(new AppError("No order found with that ID", 404));
  }

  // Send status update notification to user
  await sendStatusUpdateEmail(order.user, order._id, status);

  res.status(200).json({
    status: "success",
    data: {
      order,
    },
  });
});

export const bulkUpdateOrders = catchAsync(async (req, res, next) => {
  const { orderIds, status } = req.body;
  const validStatuses = ["processing", "shipped", "delivered", "cancelled"];

  if (!validStatuses.includes(status)) {
    return next(new AppError("Invalid order status", 400));
  }

  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    return next(new AppError("Please provide order IDs", 400));
  }

  const result = await Order.updateMany({ _id: { $in: orderIds } }, { status });

  res.status(200).json({
    status: "success",
    data: {
      matchedCount: result.n,
      modifiedCount: result.nModified,
    },
  });
});

// User Management
export const getAllUsers = catchAsync(async (req, res, next) => {
  const { role, search, page = 1, limit = 10 } = req.query;

  const query = {};
  if (role) query.role = role;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const users = await User.find(query)
    .skip((page - 1) * limit)
    .limit(limit)
    .select("-password -__v");

  const total = await User.countDocuments(query);

  res.status(200).json({
    status: "success",
    results: users.length,
    total,
    data: {
      users,
    },
  });
});

export const updateUserRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;
  const validRoles = ["user", "vendor", "admin", "product-manager"];

  if (!validRoles.includes(role)) {
    return next(new AppError("Invalid user role", 400));
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true, runValidators: true }
  ).select("-password -__v");

  if (!user) {
    return next(new AppError("No user found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

// Vendor Management
export const inviteVendor = catchAsync(async (req, res, next) => {
  const { email, name } = req.body;

  if (!email || !name) {
    return next(new AppError("Please provide vendor email and name", 400));
  }

  // Check if user already exists
  let user = await User.findOne({ email });
  if (user) {
    if (user.role === "vendor") {
      return next(new AppError("Vendor already exists", 400));
    }
    user.role = "vendor";
    await user.save();
  } else {
    // Generate invitation token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create new vendor user with pending status
    user = await User.create({
      name,
      email,
      role: "vendor",
      isEmailVerified: false,
      vendorInvitation: {
        token,
        expiresAt,
      },
    });
  }

  // Send invitation email
  await sendVendorInvitation(email, name, user.vendorInvitation.token);

  res.status(200).json({
    status: "success",
    message: "Vendor invitation sent successfully",
    data: {
      vendor: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    },
  });
});

export const getVendorStats = catchAsync(async (req, res, next) => {
  const vendorId = req.params.id;

  // Get vendor products and sales stats
  const [products, sales] = await Promise.all([
    Product.find({ vendor: vendorId }).countDocuments(),
    Order.aggregate([
      {
        $match: {
          "orderItems.product": {
            $in: await Product.distinct("_id", { vendor: vendorId }),
          },
          isPaid: true,
        },
      },
      { $unwind: "$orderItems" },
      {
        $lookup: {
          from: "products",
          localField: "orderItems.product",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      { $match: { "product.vendor": mongoose.Types.ObjectId(vendorId) } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$orderItems.quantity" },
          totalRevenue: {
            $sum: { $multiply: ["$orderItems.quantity", "$orderItems.price"] },
          },
          commissionEarned: {
            $sum: {
              $multiply: ["$orderItems.quantity", "$orderItems.price", 0.1],
            },
          }, // 10% commission
        },
      },
    ]),
  ]);

  res.status(200).json({
    status: "success",
    data: {
      products,
      sales: sales[0] || {
        totalSales: 0,
        totalRevenue: 0,
        commissionEarned: 0,
      },
    },
  });
});

// Analytics & Reports
export const generateSalesReport = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  const matchStage = {
    isPaid: true,
    createdAt: {
      $gte: new Date(startDate || "1970-01-01"),
      $lte: new Date(endDate || Date.now()),
    },
  };

  const report = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        },
        totalSales: { $sum: 1 },
        totalRevenue: { $sum: "$totalPrice" },
        averageOrderValue: { $avg: "$totalPrice" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    {
      $project: {
        date: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: {
              $dateFromParts: {
                year: "$_id.year",
                month: "$_id.month",
                day: "$_id.day",
              },
            },
          },
        },
        totalSales: 1,
        totalRevenue: 1,
        averageOrderValue: 1,
        _id: 0,
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: {
      report,
    },
  });
});

export const exportSalesReport = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  const matchStage = {
    isPaid: true,
    createdAt: {
      $gte: new Date(startDate || "1970-01-01"),
      $lte: new Date(endDate || Date.now()),
    },
  };

  const orders = await Order.aggregate([
    { $match: matchStage },
    { $unwind: "$orderItems" },
    {
      $lookup: {
        from: "products",
        localField: "orderItems.product",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $group: {
        _id: "$product._id",
        productName: { $first: "$product.name" },
        category: { $first: "$product.category" },
        quantitySold: { $sum: "$orderItems.quantity" },
        totalRevenue: {
          $sum: { $multiply: ["$orderItems.quantity", "$orderItems.price"] },
        },
      },
    },
    { $sort: { totalRevenue: -1 } },
  ]);

  const data = orders.map((item) => ({
    product: item.productName,
    category: item.category,
    quantitySold: item.quantitySold,
    totalRevenue: item.totalRevenue,
  }));

  const buffer = await generateExcel(data, "Sales Report");

  res.set({
    "Content-Type":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename=sales_report_${
      new Date().toISOString().split("T")[0]
    }.xlsx`,
  });

  res.send(buffer);
});
