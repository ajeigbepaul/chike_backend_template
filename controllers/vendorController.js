import { Vendor, VendorInvitation } from '../models/vendor.model.js';
import User from '../models/user.model.js';
import Product from '../models/product.model.js';
import Order from '../models/order.model.js';
import sendEmail from '../config/email.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';



/**
 * Verify a vendor invitation token
 */
export const verifyInvitation = catchAsync(async (req, res, next) => {
  const { token } = req.query;
  
  // Find invitation by token
  const invitation = await VendorInvitation.findByToken(token);
  
  if (!invitation) {
    return next(new AppError('Invalid or expired invitation token', 400));
  }
  
  res.status(200).json({
    success: true,
    message: 'Invitation verified successfully',
    data: {
      name: invitation.name,
      email: invitation.email
    }
  });
});

/**
 * Complete the vendor onboarding process
 */
export const completeOnboarding = catchAsync(async (req, res, next) => {
  const { token, password, phone, address, bio } = req.body;
  
  // Find and validate invitation
  const invitation = await VendorInvitation.findByToken(token);
  
  if (!invitation) {
    return next(new AppError('Invalid or expired invitation token', 400));
  }
  
  // Create the user account
  const user = await User.create({
    name: invitation.name,
    email: invitation.email,
    password,
    passwordConfirm: password, // Assuming User model has password confirmation
    role: 'vendor',
    phone
  });
  
  // Create the vendor profile
  const vendor = await Vendor.create({
    user: user._id,
    status: 'active',
    address,
    bio,
    businessName: user.name, // Use user name as default business name
    joinedDate: new Date()
  });
  
  // Update invitation status
  invitation.status = 'accepted';
  await invitation.save();
  
  // Send welcome email
  await sendEmail({
    email: user.email,
    subject: 'Welcome to Our Marketplace!',
    html: `
      <h1>Welcome to Our Marketplace!</h1>
      <p>Dear ${user.name},</p>
      <p>Your vendor account has been created successfully.</p>
      <p>You can now log in to your dashboard and start selling your products.</p>
      <p>Best regards,<br>The Marketplace Team</p>
    `
  });
  
  res.status(201).json({
    success: true,
    message: 'Vendor onboarding completed successfully',
    data: {
      vendor: {
        id: vendor._id,
        status: vendor.status,
        joinedDate: vendor.joinedDate
      }
    }
  });
});

/**
 * Get vendor profile (vendor only)
 */
export const getVendorProfile = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  
  // Find vendor with user details
  const vendor = await Vendor.findOne({ user: userId }).populate('user', 'name email phone');
  
  if (!vendor) {
    return next(new AppError('Vendor profile not found', 404));
  }
  
  res.status(200).json({
    success: true,
    message: 'Profile retrieved successfully',
    data: {
      id: vendor._id,
      businessName: vendor.businessName,
      address: vendor.address,
      bio: vendor.bio,
      status: vendor.status,
      joinedDate: vendor.joinedDate,
      user: {
        name: vendor.user.name,
        email: vendor.user.email,
        phone: vendor.user.phone
      }
    }
  });
});

/**
 * Update vendor profile (vendor only)
 */
export const updateVendorProfile = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { businessName, phone, address, bio } = req.body;
  
  // Find vendor
  const vendor = await Vendor.findOne({ user: userId });
  
  if (!vendor) {
    return next(new AppError('Vendor profile not found', 404));
  }
  
  // Update vendor fields
  if (businessName) vendor.businessName = businessName;
  if (address) vendor.address = address;
  if (bio) vendor.bio = bio;
  
  await vendor.save();
  
  // Update user phone if provided
  if (phone) {
    await User.findByIdAndUpdate(userId, { phone });
  }
  
  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      id: vendor._id,
      businessName: vendor.businessName,
      address: vendor.address,
      bio: vendor.bio
    }
  });
});

/**
 * Get vendor dashboard stats (vendor only)
 */
export const getVendorStats = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  
  const vendor = await Vendor.findOne({ user: userId });
  
  if (!vendor) {
    return next(new AppError('Vendor profile not found', 404));
  }
  
  // Update stats to ensure they're current
  await vendor.updateStats();
  
  // Get more detailed stats
  const productsCount = vendor.productsCount || 0;
  const totalOrders = vendor.ordersCount || 0;
  const totalSales = vendor.totalSales || 0;
  const totalRevenue = vendor.totalRevenue || 0;
  
  // Get low stock products (less than 5 in stock)
  const lowStockProducts = await Product.countDocuments({ 
    vendor: vendor._id,
    stock: { $lt: 5, $gt: 0 }
  });
  
  // Get pending orders
  const pendingOrders = await Order.countDocuments({
    vendor: vendor._id,
    status: 'pending'
  });
  
  // Get recent orders
  const recentOrders = await Order.find({ vendor: vendor._id })
    .sort('-createdAt')
    .limit(5)
    .populate('user', 'name email');
  
  // Format recent orders
  const formattedOrders = recentOrders.map(order => ({
    id: order._id,
    customer: {
      name: order.user?.name || 'Guest',
      email: order.user?.email || 'N/A'
    },
    orderDate: order.createdAt,
    status: order.status,
    total: order.totalAmount,
    items: order.items?.length || 0
  }));
  
  // Get popular products
  const popularProducts = await Product.find({ vendor: vendor._id })
    .sort('-sales')
    .limit(5);
  
  // Format popular products
  const formattedPopularProducts = popularProducts.map(product => ({
    id: product._id,
    name: product.name,
    price: product.price,
    stock: product.stock,
    status: product.status,
    category: product.category,
    createdAt: product.createdAt
  }));
  
  // Get low stock products data
  const inventoryAlerts = await Product.find({
    vendor: vendor._id,
    stock: { $lt: 5, $gt: 0 }
  }).limit(5);
  
  // Format inventory alerts
  const formattedInventoryAlerts = inventoryAlerts.map(product => ({
    id: product._id,
    name: product.name,
    price: product.price,
    stock: product.stock,
    status: product.status,
    category: product.category,
    createdAt: product.createdAt
  }));
  
  // Compile dashboard data
  const dashboardData = {
    stats: {
      totalProducts: productsCount,
      totalOrders,
      totalSales,
      totalRevenue,
      lowStockProducts,
      pendingOrders
    },
    recentOrders: formattedOrders,
    popularProducts: formattedPopularProducts,
    inventoryAlerts: formattedInventoryAlerts
  };
  
  res.status(200).json({
    success: true,
    message: 'Dashboard stats retrieved successfully',
    data: dashboardData
  });
});

