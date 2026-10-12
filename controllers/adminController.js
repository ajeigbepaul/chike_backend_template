// import { promisify } from "util";
import mongoose from "mongoose";
import crypto from "crypto";
// import Order from "../models/Order.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
// import Review from "../models/Review.js";
// import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import { parseSpreadsheet, generateExcel } from "../utils/excelHandler.js";
import Category from "../models/category.model.js";
import Brand from "../models/brand.model.js";
import cloudinary from "../utils/cloudinary.js";
import {
  IMPORT_COLUMNS,
  TEMPLATE_EXAMPLE_ROW,
  rowToProduct,
  productToRow,
  mapWithConcurrency,
} from "../utils/productImport.js";
import { sendVendorInvitation } from "../services/emailService.js";
import Order from "../models/order.model.js";
import AppError from "../utils/AppError.js";
import sendEmail from "../config/email.js";
import { Vendor, VendorInvitation } from "../models/vendor.model.js";

// Add this above the getDashboardStats function
const getSessionsCount = async () => {
  // TODO: Replace with real analytics/session tracking
  return 1; // or 0 if you want conversion rate to be 0
};

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
    totalUsers,
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

    // Total users (role: user)
    User.countDocuments({ role: "user" }),

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
      totalUsers: totalUsers,
      salesByRegion,
      topProducts,
      newSignups,
      abandonedCarts,
      conversionRate: conversionRate.toFixed(2),
    },
  });
});

// Product Management

const MAX_IMPORT_ROWS = 500;

// Cloudinary can fetch a remote URL itself, so we hand it the URL rather than
// downloading first. Images already hosted on Cloudinary are passed straight
// through, which keeps an export -> re-import round trip fast and lossless.
const resolveImportImage = async (url) => {
  if (!url) return null;
  if (/res\.cloudinary\.com/.test(url)) return url;
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("imageCover must be a public http(s) URL");
  }

  const result = await cloudinary.uploader.upload(url, {
    folder: "chike",
    transformation: [
      { width: 2000, height: 1333, crop: "fill" },
      { quality: "auto" },
      { fetch_format: "auto" },
    ],
  });
  return result.secure_url;
};

export const bulkImportProducts = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError("Please upload a CSV or Excel file", 400));
  }

  const rows = await parseSpreadsheet(
    req.file.buffer,
    req.file.mimetype || req.file.originalname
  );

  if (rows.length === 0) {
    return next(new AppError("That file has no data rows", 400));
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    return next(
      new AppError(
        `Too many rows (${rows.length}). Please import at most ${MAX_IMPORT_ROWS} at a time.`,
        400
      )
    );
  }

  // Resolve category/brand names to ids with two queries rather than one per row.
  const [categories, brands] = await Promise.all([
    Category.find().select("name").lean(),
    Brand.find().select("name").lean(),
  ]);
  const categoryMap = new Map(
    categories.map((c) => [String(c.name).toLowerCase(), c._id])
  );
  const brandMap = new Map(
    brands.map((b) => [String(b.name).toLowerCase(), b._id])
  );

  const errors = [];
  // Sheet row numbers: row 1 is the header, so data row i is sheet row i + 2.
  const sheetRow = (i) => i + 2;

  const mapped = rows.map((row, i) => {
    const { doc, errors: rowErrors } = rowToProduct(row, {
      categoryMap,
      brandMap,
      vendorId: req.user.id,
    });
    return { index: i, doc, rowErrors };
  });

  // Only spend Cloudinary calls on rows that are otherwise valid.
  const candidates = mapped.filter((m) => m.rowErrors.length === 0);
  mapped
    .filter((m) => m.rowErrors.length > 0)
    .forEach((m) =>
      errors.push({ row: sheetRow(m.index), message: m.rowErrors.join("; ") })
    );

  await mapWithConcurrency(candidates, 5, async (candidate) => {
    try {
      candidate.doc.imageCover = await resolveImportImage(
        candidate.doc.imageCover
      );
    } catch (err) {
      candidate.failed = true;
      errors.push({
        row: sheetRow(candidate.index),
        message: `image could not be loaded: ${err.message}`,
      });
    }
  });

  // Validate against the schema before writing, so one bad row cannot abort
  // the batch and the admin gets told exactly which row to fix.
  const valid = [];
  for (const candidate of candidates) {
    if (candidate.failed) continue;
    const product = new Product(candidate.doc);
    try {
      await product.validate();
      valid.push(product);
    } catch (err) {
      const detail = Object.values(err.errors || {})
        .map((e) => e.message)
        .join("; ");
      errors.push({
        row: sheetRow(candidate.index),
        message: detail || err.message,
      });
    }
  }

  let imported = 0;
  if (valid.length > 0) {
    // ordered:false so a late duplicate-key failure still commits the rest.
    const inserted = await Product.insertMany(valid, {
      ordered: false,
      rawResult: true,
    }).catch((err) => {
      (err.writeErrors || []).forEach((we) => {
        const candidate = candidates[we.index];
        errors.push({
          row: candidate ? sheetRow(candidate.index) : null,
          message: we.errmsg || "failed to save",
        });
      });
      return err.result ?? null;
    });
    imported = inserted?.insertedCount ?? (inserted ? valid.length : 0);
  }

  res.status(errors.length && imported === 0 ? 400 : 201).json({
    status: "success",
    data: {
      imported,
      failed: errors.length,
      total: rows.length,
      errors: errors.sort((a, b) => (a.row ?? 0) - (b.row ?? 0)),
    },
  });
});

export const bulkExportProducts = catchAsync(async (req, res, next) => {
  const products = await Product.find()
    .populate("category", "name")
    .populate("brand", "name")
    .lean();

  // Emit the exact columns the importer reads, so export -> edit -> re-import
  // round trips without losing attributes.
  const data = products.length
    ? products.map(productToRow)
    : [Object.fromEntries(IMPORT_COLUMNS.map((c) => [c, ""]))];

  const buffer = await generateExcel(data, "Products");

  res.set({
    "Content-Type":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": "attachment; filename=products_export.xlsx",
  });

  res.send(buffer);
});

// A CSV starter file with the right headers and one worked example row.
export const getProductImportTemplate = catchAsync(async (req, res, next) => {
  const escape = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csv = [
    IMPORT_COLUMNS.join(","),
    IMPORT_COLUMNS.map((c) => escape(TEMPLATE_EXAMPLE_ROW[c])).join(","),
  ].join("\n");

  res.set({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": "attachment; filename=products_import_template.csv",
  });

  res.send(csv);
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

/**
 * Invite a vendor to join the platform (admin only)
 */
export const inviteVendor = catchAsync(async (req, res, next) => {
  const { email, name, phone } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError("A user with this email already exists", 400));
  }

  // Check if invitation already exists and is still valid
  const existingInvitation = await VendorInvitation.findOne({
    email,
    status: "pending",
    expiresAt: { $gt: new Date() },
  });

  if (existingInvitation) {
    return next(
      new AppError("An invitation has already been sent to this email", 400)
    );
  }

  // Create invitation
  const invitation = await VendorInvitation.createInvitation(
    { email, name, phone },
    req.user.id
  );

  // Generate invitation link
  const invitationLink = `${process.env.FRONTEND_URL}/vendor/onboarding?token=${invitation.token}`;

  // Send invitation email
  await sendEmail({
    email: email,
    subject: "Invitation to join our marketplace as a vendor",
    html: `
      <h1>Welcome to Our Marketplace!</h1>
      <p>Dear ${name},</p>
      <p>You have been invited to join our marketplace as a vendor.</p>
      <p>Please click the link below to complete your registration:</p>
      <a href="${invitationLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accept Invitation</a>
      <p>This invitation will expire in 7 days.</p>
      <p>Best regards,<br>The Marketplace Team</p>
    `,
  });

  res.status(200).json({
    success: true,
    message: "Vendor invitation sent successfully",
    data: {
      email,
      name,
      expiresAt: invitation.expiresAt,
    },
  });
});

/**
 * Get all vendors (admin only)
 */
export const getAllVendors = catchAsync(async (req, res, next) => {
  console.log("getAllVendors called with query:", req.query);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Get total count for pagination
  const total = await Vendor.countDocuments();
  console.log("Total vendors count:", total);

  // Get vendors with user data
  const vendors = await Vendor.find()
    .populate("user", "name email phone")
    .skip(skip)
    .limit(limit)
    .sort("-joinedDate");

  console.log("Found vendors:", vendors.length);

  // Format data for frontend
  const formattedVendors = vendors.map((vendor) => ({
    id: vendor._id,
    name: vendor.user?.name || "Unknown",
    email: vendor.user?.email || "Unknown",
    status: vendor.status,
    products: vendor.productsCount || 0,
    sales: vendor.totalSales || 0,
    joinedDate: vendor.joinedDate,
    phone: vendor.user?.phone,
    businessName: vendor.businessName,
    address: vendor.address,
  }));

  res.status(200).json({
    success: true,
    message: "Vendors retrieved successfully",
    data: {
      vendors: formattedVendors,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

/**
 * Get vendor by ID (admin only)
 */
export const getVendorById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const vendor = await Vendor.findById(id).populate("user", "name email phone");

  if (!vendor) {
    return next(new AppError("Vendor not found", 404));
  }

  // Get related data
  const productsCount = await Product.countDocuments({ vendor: id });
  const ordersCount = await Order.countDocuments({ vendor: id });

  // Format vendor data
  const vendorData = {
    id: vendor._id,
    name: vendor.user?.name || "Unknown",
    email: vendor.user?.email || "Unknown",
    phone: vendor.user?.phone,
    status: vendor.status,
    products: productsCount,
    orders: ordersCount,
    sales: vendor.totalSales || 0,
    revenue: vendor.totalRevenue || 0,
    joinedDate: vendor.joinedDate,
    businessName: vendor.businessName,
    address: vendor.address,
    bio: vendor.bio,
    logo: vendor.logo,
  };

  res.status(200).json({
    success: true,
    message: "Vendor retrieved successfully",
    data: vendorData,
  });
});

/**
 * Update vendor status (admin only)
 */
export const updateVendorStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  const vendor = await Vendor.findById(id);

  if (!vendor) {
    return next(new AppError("Vendor not found", 404));
  }

  vendor.status = status;
  await vendor.save();

  // Notify vendor about status change
  const user = await User.findById(vendor.user);
  if (user) {
    await sendEmail({
      email: user.email,
      subject: `Your vendor account has been ${
        status === "active" ? "activated" : "deactivated"
      }`,
      html: `
        <h1>Account Status Update</h1>
        <p>Dear ${user.name},</p>
        <p>Your vendor account has been ${
          status === "active" ? "activated" : "deactivated"
        }.</p>
        ${
          status === "active"
            ? "<p>You can now log in and start selling your products.</p>"
            : "<p>You will not be able to sell products until your account is reactivated.</p>"
        }
        <p>If you have any questions, please contact our support team.</p>
        <p>Best regards,<br>The Marketplace Team</p>
      `,
    });
  }

  res.status(200).json({
    success: true,
    message: `Vendor status updated to ${status} successfully`,
    data: {
      id: vendor._id,
      status: vendor.status,
    },
  });
});

/**
 * Delete vendor (admin only)
 */
export const deleteVendor = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const vendor = await Vendor.findById(id);

  if (!vendor) {
    return next(new AppError("Vendor not found", 404));
  }

  // Get user
  const user = await User.findById(vendor.user);

  // Delete vendor
  await vendor.deleteOne();

  // Update user role if exists
  if (user) {
    user.role = "user";
    await user.save();

    // Notify user
    await sendEmail({
      email: user.email,
      subject: "Your vendor account has been deleted",
      html: `
        <h1>Account Update</h1>
        <p>Dear ${user.name},</p>
        <p>Your vendor account has been deleted.</p>
        <p>You can still use your account as a regular user.</p>
        <p>If you have any questions, please contact our support team.</p>
        <p>Best regards,<br>The Marketplace Team</p>
      `,
    });
  }

  res.status(200).json({
    success: true,
    message: "Vendor deleted successfully",
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
