import mongoose from "mongoose";
import crypto from "crypto";
import User from "./user.model.js";

const { Schema } = mongoose;

/**
 * Vendor Invitation Schema
 * Stores pending vendor invitations
 */
const vendorInvitationSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    token: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired"],
      default: "pending",
    },
    issuedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false, // Make issuedBy optional for public requests
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Vendor Schema
 * Extends User with vendor-specific fields
 */
const vendorSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    businessName: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
    },
    logo: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "active", "inactive"],
      default: "pending",
    },
    joinedDate: {
      type: Date,
      default: Date.now,
    },
    // Stats fields - will be calculated/updated when products/orders are created
    productsCount: {
      type: Number,
      default: 0,
    },
    ordersCount: {
      type: Number,
      default: 0,
    },
    totalSales: {
      type: Number,
      default: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for products relationship
vendorSchema.virtual("products", {
  ref: "Product",
  localField: "_id",
  foreignField: "vendor",
});

// Virtual for orders relationship
vendorSchema.virtual("orders", {
  ref: "Order",
  localField: "_id",
  foreignField: "vendor",
});

// Methods for the Vendor Invitation Schema
vendorInvitationSchema.statics.generateInvitationToken = function () {
  return crypto.randomBytes(32).toString("hex");
};

vendorInvitationSchema.statics.findByToken = async function (token) {
  const invitation = await this.findOne({
    token,
    status: "pending",
    expiresAt: { $gt: new Date() },
  });
  return invitation;
};

vendorInvitationSchema.statics.createInvitation = async function (
  data,
  adminId
) {
  const token = this.generateInvitationToken();
  const invitation = await this.create({
    email: data.email,
    name: data.name,
    phone: data.phone,
    token,
    issuedBy: adminId,
  });
  return invitation;
};

// Methods for the Vendor Schema
vendorSchema.statics.findVendorByUserId = async function (userId) {
  return this.findOne({ user: userId }).populate("user");
};

vendorSchema.statics.createFromInvitation = async function (
  invitation,
  userId
) {
  return this.create({
    user: userId,
    status: "active",
    joinedDate: new Date(),
  });
};

vendorSchema.methods.updateStats = async function () {
  // Placeholder for stats update logic
  // This would calculate productsCount, totalSales, etc. from related collections
  const products = await mongoose
    .model("Product")
    .countDocuments({ vendor: this._id });
  this.productsCount = products;

  // Update other stats as needed
  // Would fetch from Order model in a real implementation

  return this.save();
};

const VendorInvitation = mongoose.model(
  "VendorInvitation",
  vendorInvitationSchema
);
const Vendor = mongoose.model("Vendor", vendorSchema);

export { Vendor, VendorInvitation };
