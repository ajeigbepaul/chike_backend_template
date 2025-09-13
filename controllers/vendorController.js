import { Vendor, VendorInvitation } from "../models/vendor.model.js";
import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import Order from "../models/order.model.js";
import sendEmail from "../config/email.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import { EMAIL_FROM } from "../config/env.js";
/**
 * Verify a vendor invitation token
 */
export const verifyInvitation = catchAsync(async (req, res, next) => {
  const { token } = req.query;

  // Find invitation by token
  const invitation = await VendorInvitation.findByToken(token);

  if (!invitation) {
    return next(new AppError("Invalid or expired invitation token", 400));
  }

  res.status(200).json({
    success: true,
    message: "Invitation verified successfully",
    data: {
      name: invitation.name,
      email: invitation.email,
    },
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
    return next(new AppError("Invalid or expired invitation token", 400));
  }

  // Create the user account
  const user = await User.create({
    name: invitation.name,
    email: invitation.email,
    password,
    passwordConfirm: password, // Assuming User model has password confirmation
    role: "vendor",
    phone,
    isEmailVerified: true, // Assuming User model has isVerified field
  });

  // Create the vendor profile
  const vendor = await Vendor.create({
    user: user._id,
    status: "active",
    address,
    bio,
    businessName: user.name, // Use user name as default business name
    joinedDate: new Date(),
  });

  // Update invitation status
  invitation.status = "accepted";
  await invitation.save();

  // Send welcome email
  await sendEmail({
    email: user.email,
    subject: "Welcome to Our Marketplace!",
    html: `
      <h1>Welcome to Our Marketplace!</h1>
      <p>Dear ${user.name},</p>
      <p>Your vendor account has been created successfully.</p>
      <p>You can now log in to your dashboard and start selling your products.</p>
      <p>Best regards,<br>The Marketplace Team</p>
    `,
  });

  res.status(201).json({
    success: true,
    message: "Vendor onboarding completed successfully",
    data: {
      vendor: {
        id: vendor._id,
        status: vendor.status,
        joinedDate: vendor.joinedDate,
      },
    },
  });
});

/**
 * Direct vendor onboarding (no invitation)
 */
export const directOnboarding = catchAsync(async (req, res, next) => {
  const { userId, password, phone, address, bio } = req.body;

  // Find user
  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Check if user is already a vendor
  if (user.role === "vendor") {
    // Check if vendor profile exists
    const existingVendor = await Vendor.findOne({ user: user._id });
    if (existingVendor) {
      return next(new AppError("User is already a vendor", 400));
    }
  }

  // Set password if not set (or allow update)
  if (!user.password || user.password.length < 8) {
    user.password = password;
    user.passwordConfirm = password;
  }
  // Set phone if not set
  if (!user.phone) {
    user.phone = phone;
  }
  user.role = "vendor";
  user.isEmailVerified = true;
  await user.save();

  // Create vendor profile if not exists
  let vendor = await Vendor.findOne({ user: user._id });
  if (!vendor) {
    vendor = await Vendor.create({
      user: user._id,
      status: "active",
      address,
      bio,
      businessName: user.name,
      joinedDate: new Date(),
    });
  }

  // Send welcome email
  await sendEmail({
    email: user.email,
    subject: "Welcome to Our Marketplace!",
    html: `
      <h1>Welcome to Our Marketplace!</h1>
      <p>Dear ${user.name},</p>
      <p>Your vendor account has been created successfully.</p>
      <p>You can now log in to your dashboard and start selling your products.</p>
      <p>Best regards,<br>The Marketplace Team</p>
    `,
  });

  res.status(201).json({
    success: true,
    message: "Vendor onboarding completed successfully",
    data: {
      vendor: {
        id: vendor._id,
        status: vendor.status,
        joinedDate: vendor.joinedDate,
      },
    },
  });
});

/**
 * Handle vendor invitation requests from the public form
 */
// export const requestInvite = catchAsync(async (req, res, next) => {
//   const { email, name } = req.body;

//   // Check if the email is already associated with a vendor
//   const existingUser = await User.findOne({ email });
//   if (existingUser && existingUser.role === "vendor") {
//     const existingVendor = await Vendor.findOne({ user: existingUser._id });
//     if (existingVendor) {
//       return next(new AppError("This email is already associated with a vendor", 400));
//     }
//   }

//   // Check if a pending invitation already exists for this email
//   const existing = await VendorInvitation.findOne({ email, status: "pending" });
//   if (existing) {
//     return next(
//       new AppError("An invitation has already been sent to this email.", 400)
//     );
//   }

//   // Generate a token
//   const token = VendorInvitation.generateInvitationToken();
//   // Create the invitation (issuedBy is null for public requests)
//   await VendorInvitation.create({
//     email,
//     name,
//     token,
//     status: "pending",
//     issuedBy: null,
//     expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
//   });

//   // Send an email to the admin
//   await sendEmail({
//     email: process.env.EMAIL_USER,
//     subject: "New Vendor Invitation Request",
//     html: `
//       <h2>New Vendor Invitation Request</h2>
//       <p><strong>Name:</strong> ${name}</p>
//       <p><strong>Email:</strong> ${email}</p>
//       <p>Please review and send an invitation if appropriate.</p>
//     `,
//   });

//   res.status(200).json({
//     success: true,
//     message: "Your request has been received. Our team will contact you soon.",
//   });
// });
export const requestInvite = catchAsync(async (req, res, next) => {
  const { email, name } = req.body;

  // Validate input
  if (!email || !name) {
    return next(new AppError("Name and email are required", 400));
  }

  // Check if a pending or requested invitation already exists for this email
  const existingInvitation = await VendorInvitation.findOne({
    email,
    status: { $in: ["request", "pending"] },
  });
  if (existingInvitation) {
    return next(
      new AppError(
        `A ${existingInvitation.status} invitation already exists for this email`,
        400
      )
    );
  }

  // Check if the email is already associated with a vendor
  const existingUser = await User.findOne({ email });
  if (existingUser && existingUser.role === "vendor") {
    const existingVendor = await Vendor.findOne({ user: existingUser._id });
    if (existingVendor) {
      return next(
        new AppError("This email is already associated with a vendor", 400)
      );
    }
  }

  // Generate a token (for tracking purposes)
  const token = VendorInvitation.generateInvitationToken();

  // Create the invitation request
  const invitation = await VendorInvitation.create({
    email,
    name,
    token,
    status: "request", // Set status to request
    issuedBy: null, // User-initiated request
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });

  try {
    // Send email to the admin
    await sendEmail({
      email: EMAIL_FROM || "cruiselandtravelstour@gmail.com", // Admin email
      subject: "New Vendor Invitation Request",
      html: `
        <h2>New Vendor Invitation Request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p>Please review this request and send an invitation if appropriate.</p>
        <p><a href="${
          process.env.FRONTEND_URL || "http://localhost:3000"
        }/admin/vendors">Go to Vendor Management</a></p>
      `,
    });

    // Send confirmation email to the user
    await sendEmail({
      email,
      subject: "Vendor Request Received",
      html: `
        <h2>Vendor Request Confirmation</h2>
        <p>Hello ${name},</p>
        <p>We have received your request to become a vendor. Our team will review your request and contact you soon.</p>
        <p>Thank you,<br>The Marketplace Team</p>
      `,
    });

    res.status(200).json({
      success: true,
      message:
        "Your request has been received. Our team will contact you soon.",
    });
  } catch (error) {
    // Roll back the invitation request if email sending fails
    await VendorInvitation.deleteOne({ _id: invitation._id });
    return next(
      new AppError(`Failed to send request notification: ${error.message}`, 500)
    );
  }
});
/**
 * Get vendor profile (vendor only)
 */
export const getVendorProfile = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  // Find vendor with user details
  const vendor = await Vendor.findOne({ user: userId }).populate(
    "user",
    "name email phone"
  );

  if (!vendor) {
    return next(new AppError("Vendor profile not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Profile retrieved successfully",
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
        phone: vendor.user.phone,
      },
    },
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
    return next(new AppError("Vendor profile not found", 404));
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
    message: "Profile updated successfully",
    data: {
      id: vendor._id,
      businessName: vendor.businessName,
      address: vendor.address,
      bio: vendor.bio,
    },
  });
});

/**
 * Get vendor dashboard stats (vendor only)
 */
export const getVendorStats = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const vendor = await Vendor.findOne({ user: userId });

  if (!vendor) {
    return next(new AppError("Vendor profile not found", 404));
  }

  // Update stats to ensure they're current (if supported by model)
  if (typeof vendor.updateStats === "function") {
    await vendor.updateStats();
  }

  // Compute products owned by this vendor (product.vendor references User)
  const vendorUserId = vendor.user;
  const vendorProducts = await Product.find({ vendor: vendorUserId }).select(
    "_id name price quantity status category createdAt sold"
  );
  const productIds = vendorProducts.map((p) => p._id);

  // Get more detailed stats
  const productsCount = productIds.length;
  const totalOrders = vendor.ordersCount || 0; // updated in updateStats
  const totalSales = vendor.totalSales || 0; // updated in updateStats
  const totalRevenue = vendor.totalRevenue || 0; // updated in updateStats

  // Get low stock products (less than 5 in stock)
  const lowStockProducts = await Product.countDocuments({
    vendor: vendorUserId,
    quantity: { $lt: 5, $gt: 0 },
  });

  // Get pending orders that include this vendor's products
  const pendingOrders = await Order.countDocuments({
    "orderItems.product": { $in: productIds },
    status: "pending",
  });

  // Get recent orders containing this vendor's products
  const recentOrders = await Order.find({
    "orderItems.product": { $in: productIds },
  })
    .sort("-createdAt")
    .limit(5)
    .populate("user", "name email");

  // Format recent orders (compute total for this vendor's items only)
  const formattedOrders = recentOrders.map((order) => {
    const vendorItems =
      order.orderItems?.filter((it) =>
        productIds.some((id) => id.equals(it.product?._id || it.product))
      ) || [];
    const vendorTotal = vendorItems.reduce(
      (sum, it) => sum + (it.price || 0) * (it.quantity || 0),
      0
    );
    return {
      id: order._id,
      customer: {
        name: order.user?.name || "Guest",
        email: order.user?.email || "N/A",
      },
      orderDate: order.createdAt,
      status: order.status,
      total: vendorTotal,
      items: vendorItems.length,
    };
  });

  // Get popular products (by sold count)
  const popularProducts = await Product.find({ vendor: vendorUserId })
    .sort("-sold")
    .limit(5)
    .populate("category", "name");

  // Format popular products (category as name)
  const formattedPopularProducts = popularProducts.map((product) => ({
    id: product._id,
    name: product.name,
    price: product.price,
    stock: product.quantity,
    status: product.isActive ? "active" : "inactive",
    category: product.category?.name || "N/A",
    createdAt: product.createdAt,
  }));

  // Get low stock products data
  const inventoryAlerts = await Product.find({
    vendor: vendorUserId,
    quantity: { $lt: 5, $gt: 0 },
  })
    .limit(5)
    .populate("category", "name");

  // Format inventory alerts (category as name)
  const formattedInventoryAlerts = inventoryAlerts.map((product) => ({
    id: product._id,
    name: product.name,
    price: product.price,
    stock: product.quantity,
    status: product.isActive ? "active" : "inactive",
    category: product.category?.name || "N/A",
    createdAt: product.createdAt,
  }));

  // Compile dashboard data
  const dashboardData = {
    stats: {
      totalProducts: productsCount,
      totalOrders,
      totalSales,
      totalRevenue,
      lowStockProducts,
      pendingOrders,
    },
    recentOrders: formattedOrders,
    popularProducts: formattedPopularProducts,
    inventoryAlerts: formattedInventoryAlerts,
  };

  res.status(200).json({
    success: true,
    message: "Dashboard stats retrieved successfully",
    data: dashboardData,
  });
});

/**
 * Get products for the authenticated vendor (vendor only)
 */
export const getMyProducts = catchAsync(async (req, res, next) => {
  const vendor = await Vendor.findOne({ user: req.user.id });
  if (!vendor) return next(new AppError("Vendor profile not found", 404));

  const products = await Product.find({ vendor: vendor.user })
    .populate("category", "name")
    .select("name price quantity imageCover images moq createdAt category");

  res.status(200).json({
    success: true,
    data: products.map((p) => ({
      id: p._id,
      name: p.name,
      price: p.price,
      quantity: p.quantity,
      image: p.imageCover || p.images?.[0] || "",
      moq: p.moq,
      category: p.category?.name || "N/A",
      createdAt: p.createdAt,
    })),
  });
});
/**
 * Get all vendors (admin only)
 */
export const getAllVendors = catchAsync(async (req, res, next) => {
  const vendors = await Vendor.find({ status: "active" }).populate(
    "user",
    "name email"
  );
  res.status(200).json({
    success: true,
    data: vendors.map((v) => ({
      id: v._id,
      businessName: v.businessName,
      user: v.user,
      status: v.status,
    })),
  });
});

/**
 * Get all pending vendor invitations (admin only)
 */
// export const getPendingInvitations = catchAsync(async (req, res, next) => {
//   const invitations = await VendorInvitation.find({ status: "pending" })
//     .select("name email status createdAt token")
//     .sort("-createdAt");
//   res.status(200).json({
//     success: true,
//     data: invitations,
//   });
// });

// New controller to fetch all invitations (request and pending)
export const getAllInvitations = catchAsync(async (req, res, next) => {
  const invitations = await VendorInvitation.find({
    status: { $in: ["request", "pending"] },
  })
    .select("name email status createdAt _id")
    .sort("-createdAt");

  res.status(200).json({
    success: true,
    message: "Invitations retrieved successfully",
    data: invitations,
  });
});

/**
 * Admin: Resend a pending vendor invitation
 */
export const resendInvitation = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const invitation = await VendorInvitation.findById(id);
  if (!invitation || invitation.status !== "pending") {
    return next(new AppError("Pending invitation not found", 404));
  }
  // Generate a new token and update expiry
  invitation.token = VendorInvitation.generateInvitationToken();
  invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await invitation.save();
  // Send invitation email to the user
  await sendEmail({
    email: invitation.email,
    subject: "You are invited to become a vendor!",
    html: `
      <h2>Vendor Invitation</h2>
      <p>Hello ${invitation.name},</p>
      <p>You have been invited to become a vendor. Click the link below to complete your onboarding:</p>
      <p><a href="${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/vendor/onboarding?token=${invitation.token}">Accept Invitation</a></p>
      <p>This invitation will expire in 7 days.</p>
    `,
  });
  res.status(200).json({
    success: true,
    message: "Invitation resent successfully",
  });
});

/**
 * Admin: Delete a pending vendor invitation
 */
export const deleteInvitation = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const invitation = await VendorInvitation.findOneAndDelete({
    _id: id,
    status: { $in: ["request", "pending", "active"] },
  });

  if (!invitation) {
    return next(new AppError("No invitation found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Invitation deleted successfully",
  });
});

/**
 * Admin: Approve a vendor request and send invitation
 */
export const approveVendorRequest = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Find the vendor request
  const invitation = await VendorInvitation.findById(id);

  if (!invitation) {
    return next(new AppError("Vendor request not found", 404));
  }

  if (invitation.status !== "request") {
    return next(new AppError("Only requests can be approved", 400));
  }

  // Check if the user is already a registered vendor
  const existingUser = await User.findOne({ email: invitation.email });
  if (existingUser && existingUser.role === "vendor") {
    const existingVendor = await Vendor.findOne({ user: existingUser._id });
    if (existingVendor) {
      return next(
        new AppError("This email is already associated with a vendor", 400)
      );
    }
  }

  // Update the invitation to pending status
  invitation.status = "pending";
  invitation.issuedBy = req.user._id;
  invitation.token = VendorInvitation.generateInvitationToken();
  invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await invitation.save();

  // Send invitation email
  await sendEmail({
    email: invitation.email,
    subject: "You are invited to become a vendor!",
    html: `
      <h2>Vendor Invitation Approved</h2>
      <p>Hello ${invitation.name},</p>
      <p>Great news! Your request to become a vendor has been approved.</p>
      <p>Click the link below to complete your onboarding:</p>
      <p><a href="${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/vendor/onboarding?token=${
      invitation.token
    }">Complete Vendor Setup</a></p>
      <p>This invitation will expire in 7 days.</p>
      <p>Welcome to our marketplace!</p>
    `,
  });

  res.status(200).json({
    success: true,
    message: "Vendor request approved and invitation sent successfully",
    data: {
      id: invitation._id,
      email: invitation.email,
      name: invitation.name,
      status: invitation.status,
      createdAt: invitation.createdAt,
    },
  });
});

/**
 * Admin: Send a vendor invitation directly (for new emails)
 */
export const inviteVendor = catchAsync(async (req, res, next) => {
  const { email, name } = req.body;

  if (!email || !name) {
    return next(new AppError("Name and email are required", 400));
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check if any invitation already exists for this email
  const existingInvitation = await VendorInvitation.findOne({
    email: normalizedEmail,
  });
  if (existingInvitation) {
    return next(
      new AppError(
        `An invitation already exists for this email with status: ${existingInvitation.status}`,
        400
      )
    );
  }

  // Check if the user is already a registered vendor
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser && existingUser.role === "vendor") {
    const existingVendor = await Vendor.findOne({ user: existingUser._id });
    if (existingVendor) {
      return next(
        new AppError("This email is already associated with a vendor", 400)
      );
    }
  }

  // Create new invitation
  const invitation = await VendorInvitation.create({
    email: normalizedEmail,
    name,
    token: VendorInvitation.generateInvitationToken(),
    status: "pending",
    issuedBy: req.user._id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  // Send invitation email
  await sendEmail({
    email: normalizedEmail,
    subject: "You are invited to become a vendor!",
    html: `
      <h2>Vendor Invitation</h2>
      <p>Hello ${invitation.name},</p>
      <p>You have been invited to become a vendor on our marketplace.</p>
      <p>Click the link below to complete your onboarding:</p>
      <p><a href="${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/vendor/onboarding?token=${invitation.token}">Accept Invitation</a></p>
      <p>This invitation will expire in 7 days.</p>
    `,
  });

  res.status(200).json({
    success: true,
    message: "Invitation sent successfully",
    data: {
      id: invitation._id,
      email: invitation.email,
      name: invitation.name,
      status: invitation.status,
      createdAt: invitation.createdAt,
    },
  });
});

/**
 * Admin: Get vendor by ID
 */
export const getVendorById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const vendor = await Vendor.findById(id).populate("user", "name email phone");

  if (!vendor) {
    return next(new AppError("Vendor not found", 404));
  }

  // Get vendor stats
  const productsCount = await Product.countDocuments({ vendor: vendor._id });
  const totalOrders = await Order.countDocuments({ vendor: vendor._id });
  const totalRevenue = await Order.aggregate([
    { $match: { vendor: vendor._id, status: "completed" } },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);

  res.status(200).json({
    success: true,
    message: "Vendor retrieved successfully",
    data: {
      id: vendor._id,
      name: vendor.user?.name || "N/A",
      email: vendor.user?.email || "N/A",
      phone: vendor.user?.phone || "N/A",
      businessName: vendor.businessName,
      address: vendor.address,
      bio: vendor.bio,
      status: vendor.status,
      joinedDate: vendor.joinedDate,
      productsCount,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
    },
  });
});

/**
 * Admin: Delete vendor
 */
export const deleteVendor = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const vendor = await Vendor.findById(id).populate("user");

  if (!vendor) {
    return next(new AppError("Vendor not found", 404));
  }

  // Check if vendor has active products or orders
  const productsCount = await Product.countDocuments({ vendor: vendor._id });
  const ordersCount = await Order.countDocuments({
    vendor: vendor._id,
    status: { $in: ["pending", "processing"] },
  });

  if (productsCount > 0 || ordersCount > 0) {
    return next(
      new AppError(
        "Cannot delete vendor with active products or pending orders. Please deactivate instead.",
        400
      )
    );
  }

  // Delete the vendor and associated user
  await Vendor.findByIdAndDelete(id);
  if (vendor.user) {
    await User.findByIdAndDelete(vendor.user._id);
  }

  res.status(200).json({
    success: true,
    message: "Vendor deleted successfully",
  });
});
