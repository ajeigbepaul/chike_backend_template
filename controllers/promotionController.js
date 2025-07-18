import Promotion from "../models/promotion.model.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";

export const getAllPromotions = catchAsync(async (req, res, next) => {
  const promotions = await Promotion.find();

  res.status(200).json({
    status: "success",
    results: promotions.length,
    data: {
      promotions,
    },
  });
});

export const getPromotion = catchAsync(async (req, res, next) => {
  const promotion = await Promotion.findById(req.params.id)
    .populate("products")
    .populate("categories");

  if (!promotion) {
    return next(new AppError("No promotion found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      promotion,
    },
  });
});

export const createPromotion = catchAsync(async (req, res, next) => {
  const newPromotion = await Promotion.create(req.body);

  res.status(201).json({
    status: "success",
    data: {
      promotion: newPromotion,
    },
  });
});

export const updatePromotion = catchAsync(async (req, res, next) => {
  const promotion = await Promotion.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!promotion) {
    return next(new AppError("No promotion found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      promotion,
    },
  });
});

export const deletePromotion = catchAsync(async (req, res, next) => {
  const promotion = await Promotion.findByIdAndDelete(req.params.id);

  if (!promotion) {
    return next(new AppError("No promotion found with that ID", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const validateCoupon = catchAsync(async (req, res, next) => {
  const { code, cartItems } = req.body;
  if (!code || !cartItems || !Array.isArray(cartItems)) {
    return next(new AppError("Coupon code and cart items are required", 400));
  }

  // Find active promotion by name (or code, if you add a code field)
  const now = new Date();
  const promotion = await Promotion.findOne({
    name: code,
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  });
  if (!promotion) {
    return next(new AppError("Invalid or expired coupon code", 400));
  }

  // Determine applicable products
  let applicableProductIds = [];
  if (promotion.applicableTo === "all_products") {
    applicableProductIds = cartItems.map((item) => item.product);
  } else if (promotion.applicableTo === "specific_products") {
    applicableProductIds = promotion.products.map((id) => id.toString());
  } else if (promotion.applicableTo === "specific_categories") {
    // You may need to fetch product categories here
    // For now, assume cartItems have a category field
    applicableProductIds = cartItems
      .filter((item) =>
        promotion.categories.some((catId) => catId.toString() === item.category)
      )
      .map((item) => item.product);
  }

  // Calculate discount
  let discount = 0;
  let applicableItems = cartItems.filter((item) =>
    applicableProductIds.includes(item.product)
  );
  let totalApplicable = applicableItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (promotion.type === "percentage") {
    discount = (promotion.value / 100) * totalApplicable;
    if (
      promotion.maximumDiscountAmount &&
      discount > promotion.maximumDiscountAmount
    ) {
      discount = promotion.maximumDiscountAmount;
    }
  } else if (promotion.type === "fixed_amount") {
    discount = Math.min(promotion.value, totalApplicable);
  }

  // Check minimum order amount
  if (
    promotion.minimumOrderAmount &&
    totalApplicable < promotion.minimumOrderAmount
  ) {
    return next(
      new AppError(
        `Minimum order amount for this coupon is ₦${promotion.minimumOrderAmount}`,
        400
      )
    );
  }

  if (discount <= 0) {
    return next(
      new AppError("Coupon does not apply to any items in your cart", 400)
    );
  }

  res.status(200).json({
    success: true,
    discount,
    promotion: {
      name: promotion.name,
      type: promotion.type,
      value: promotion.value,
      message: `Coupon applied: -₦${discount}`,
    },
  });
});
