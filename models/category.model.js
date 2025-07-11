import mongoose from "mongoose";
import slugify from "slugify";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A category must have a name"],
      // unique: true,
      trim: true,
      maxlength: [
        100,
        "A category name must have less or equal than 100 characters",
      ],
      minlength: [
        2,
        "A category name must have more or equal than 2 characters",
      ],
    },
    slug: String,
    image: {
      type: String,
      default: "/default-category.jpg",
    },
    level: {
      type: Number,
      default: 1,
    },
    parent: {
      type: mongoose.Schema.ObjectId,
      ref: "Category",
      default: null,
    },
    ancestors: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Category",
      },
    ],
    path: {
      type: String,
      default: "",
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
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

// Virtual populate subcategories
categorySchema.virtual("subcategories", {
  ref: "Category",
  foreignField: "parent",
  localField: "_id",
});

// Indexes
categorySchema.index({ slug: 1 });
categorySchema.index({ parent: 1 });
categorySchema.index({ ancestors: 1 });
categorySchema.index({ path: 1 });
categorySchema.index({ name: 1, parent: 1 }, { unique: true });

// Pre-save middleware to create slug
categorySchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// Pre-save middleware to validate category level and update path
categorySchema.pre("save", async function (next) {
  if (!this.isModified("parent")) return next();

  if (this.parent) {
    const parentCategory = await this.constructor.findById(this.parent);
    if (!parentCategory) {
      return next(new Error("Parent category not found"));
    }
    this.level = parentCategory.level + 1;
    this.ancestors = [...parentCategory.ancestors, parentCategory._id];
    this.path = `${parentCategory.path}/${this.name}`;
  } else {
    this.level = 1;
    this.ancestors = [];
    this.path = this.name;
  }
  next();
});

// Method to get full category path
categorySchema.methods.getFullPath = async function () {
  return this.path;
};

// Static method to get category tree
categorySchema.statics.getCategoryTree = async function () {
  const categories = await this.find().sort("order");
  const tree = [];
  const map = {};

  // Create a map of all categories
  categories.forEach((category) => {
    map[category._id] = {
      ...category.toObject(),
      subcategories: [],
    };
  });

  // Build the tree
  categories.forEach((category) => {
    if (category.parent) {
      map[category.parent].subcategories.push(map[category._id]);
    } else {
      tree.push(map[category._id]);
    }
  });

  return tree;
};

const Category = mongoose.model("Category", categorySchema);
export default Category;
