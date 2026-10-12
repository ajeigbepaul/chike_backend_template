import mongoose from "mongoose";
import validator from "validator";

const quoteSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.ObjectId,
      ref: "Product",
      required: [true, "A quote must be for a product"],
    },
    productName: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be a whole number",
      },
    },
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
      maxlength: [100, "Customer name is too long"],
    },
    customerEmail: {
      type: String,
      required: [true, "Customer email is required"],
      trim: true,
      lowercase: true,
      maxlength: [254, "Email is too long"],
      validate: [validator.isEmail, "Please provide a valid email address"],
    },
    customerPhone: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
      maxlength: [100, "Company name is too long"],
    },
    message: {
      type: String,
      trim: true,
      maxlength: [2000, "Message is too long"],
    },
    expectedPrice: {
      type: Number,
      min: [0, "Expected price must be above 0"],
      max: [1000000000, "Expected price is too large"],
    },
    urgency: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["pending", "responded", "accepted", "rejected"],
      default: "pending",
    },
    responseMessage: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
    },
    approvedPrice: {
      type: Number,
      min: [0, "Approved price must be a positive number"],
    },
    approvedQuantity: {
      type: Number,
      min: [1, "Approved quantity must be at least 1"],
    },
    respondedAt: {
      type: Date,
    },
    respondedBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    messages: [
      {
        sender: { type: String, enum: ["user", "admin"], required: true },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better performance
quoteSchema.index({ productId: 1 });
quoteSchema.index({ customerEmail: 1 });
quoteSchema.index({ status: 1 });
quoteSchema.index({ urgency: 1 });
quoteSchema.index({ createdAt: -1 });

// Update the updatedAt field on save
quoteSchema.pre("save", function (next) {
  this.updatedAt = Date.now();

  // Set respondedAt when status changes from pending to responded
  if (
    this.isModified("status") &&
    this.status === "responded" &&
    !this.respondedAt
  ) {
    this.respondedAt = Date.now();
  }

  next();
});

const Quote = mongoose.model("Quote", quoteSchema);
export default Quote;
