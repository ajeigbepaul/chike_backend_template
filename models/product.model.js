import mongoose from "mongoose";
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A product must have a name"],
      trim: true,
      maxlength: [
        100,
        "A product name must have less or equal than 100 characters",
      ],
      minlength: [
        5,
        "A product name must have more or equal than 10 characters",
      ],
    },
    slug: String,
    description: {
      type: String,
      required: [true, "A product must have a description"],
      trim: true,
    },
    summary: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "A product must have a price"],
      min: [0, "Price must be above 0"],
    },
    priceUnit: {
      type: String,
      enum: [
        "m2",
        "m3",
        "piece",
        "kg",
        "unit",
        "set",
        "box",
        "roll",
        "liter",
        "gallon",
        "meter",
        "cm",
        "mm",
        "feet",
        "inch",
      ],
      default: "piece",
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          return val < this.price;
        },
        message: "Discount price ({VALUE}) should be below regular price",
      },
    },
    category: {
      type: mongoose.Schema.ObjectId,
      ref: "Category",
      required: [true, "A product must belong to a category"],
    },
    subCategories: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "SubCategory",
      },
    ],
    quantity: {
      type: Number,
      required: [true, "A product must have a quantity"],
      min: [0, "Quantity must be above 0"],
    },
    sold: {
      type: Number,
      default: 0,
    },
    images: [String],
    imageCover: {
      type: String,
      required: [true, "A product must have a cover image"],
    },
    colors: [String],
    sizes: [String],
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, "Rating must be above 1.0"],
      max: [5, "Rating must be below 5.0"],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    serialNumber: {
      type: String,
      unique: true,
      sparse: true, // Allows null values to not violate unique constraint
      trim: true,
    },
    weight: {
      value: { type: Number, min: 0 },
      unit: { type: String, enum: ["kg", "g", "lb"], default: "kg" },
    },
    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
      unit: { type: String, enum: ["m", "cm", "mm", "ft", "in"], default: "m" },
    },
    brand: {
      type: mongoose.Schema.ObjectId,
      ref: "Brand",
    },
    vendor: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    features: [String],
    specifications: [
      {
        key: String,
        value: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    isBulk: {
      type: Boolean,
      default: false,
    },
    moq: {
      type: Number,
      default: 1,
      min: [1, "Minimum order quantity must be at least 1"],
      required: [true, "A product must have a minimum order quantity"],
    },
    minBulkQuantity: {
      type: Number,
      default: 10,
    },
    bulkDiscountPercentage: {
      type: Number,
      default: 0,
    },
    variants: [
      {
        attributes: [
          {
            name: String,
            value: String,
          },
        ],
        price: {
          type: Number,
          required: [true, "A variant must have a price"],
          min: [0, "Price must be above 0"],
        },
        quantity: {
          type: Number,
          required: [true, "A variant must have a quantity"],
          min: [0, "Quantity must be above 0"],
        },
      },
    ],
    accessories: [
      {
        name: { type: String, required: true },
        products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
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

// Virtual populate reviews
productSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "product",
  localField: "_id",
});

// Indexes for better performance
productSchema.index({ price: 1, ratingsAverage: -1 });
productSchema.index({ slug: 1 });
productSchema.index({ name: "text", description: "text" });

const Product = mongoose.model("Product", productSchema);
export default Product;
