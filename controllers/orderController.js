// import Order from '../models/Order.js';
import Order from '../models/order.model.js'
import Product from '../models/product.model.js';
import AppError  from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import generateInvoice from '../utils/generateInvoice.js';
import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';
import Category from '../models/category.model.js';
import { generateOrderId } from '../utils/generateOrderId.js';
import Promotion from '../models/promotion.model.js';
import Quote from '../models/quote.model.js';
import mongoose from 'mongoose';

const VAT_RATE = 0.07;
const SHIPPING_PRICE = 20000;

const roundCurrency = (amount) => Math.round((amount + Number.EPSILON) * 100) / 100;

export const createOrder = catchAsync(async (req, res, next) => {
  const { orderItems, shippingAddress, paymentMethod, couponCode } = req.body;
  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    return next(new AppError('No order items', 400));
  }
  if (!paymentMethod || !shippingAddress?.street) {
    return next(new AppError('Shipping address and payment method are required', 400));
  }

  const productIds = orderItems.map((item) => item.product);
  if (productIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    return next(new AppError('One or more product IDs are invalid', 400));
  }
  const products = await Product.find({ _id: { $in: productIds } });
  const productsById = new Map(products.map((product) => [product._id.toString(), product]));
  const normalizedItems = [];

  for (const item of orderItems) {
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return next(new AppError('Order quantities must be whole numbers greater than zero', 400));
    }

    const product = productsById.get(String(item.product));
    if (!product || !product.isActive) {
      return next(new AppError('One or more products are unavailable', 400));
    }

    let price = product.price;
    if (item.quoteId) {
      const quote = await Quote.findById(item.quoteId);
      if (
        !quote ||
        quote.customerEmail.toLowerCase() !== req.user.email.toLowerCase() ||
        quote.status !== 'accepted' ||
        quote.productId.toString() !== product._id.toString() ||
        quote.approvedQuantity !== quantity ||
        !Number.isFinite(quote.approvedPrice) ||
        quote.approvedPrice <= 0
      ) {
        return next(new AppError('The approved quote is invalid or no longer available', 400));
      }
      price = quote.approvedPrice;
    } else if (quantity < product.moq) {
      return next(
        new AppError(`${product.name} requires a minimum quantity of ${product.moq}`, 400)
      );
    }

    normalizedItems.push({
      product: product._id,
      quantity,
      price,
      color: item.color,
      size: item.size,
    });
  }

  const quantitiesByProduct = normalizedItems.reduce((totals, item) => {
    const id = item.product.toString();
    totals.set(id, (totals.get(id) || 0) + item.quantity);
    return totals;
  }, new Map());

  for (const [productId, quantity] of quantitiesByProduct) {
    const product = productsById.get(productId);
    if (product.quantity < quantity) {
      return next(
        new AppError(
          `Not enough stock for product: ${product.name}. Only ${product.quantity} available`,
          400
        )
      );
    }
  }

  const itemsPrice = roundCurrency(
    normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );
  const taxPrice = roundCurrency(itemsPrice * VAT_RATE);
  let discountPrice = 0;
  let promotion;
  if (couponCode) {
    const now = new Date();
    promotion = await Promotion.findOne({
      name: String(couponCode).trim(),
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    });
    if (!promotion || promotion.applicableTo !== 'all_products') {
      return next(new AppError('Invalid or expired coupon code', 400));
    }
    if (promotion.usageLimit != null && promotion.usedCount >= promotion.usageLimit) {
      return next(new AppError('Coupon usage limit has been reached', 400));
    }
    if (itemsPrice < promotion.minimumOrderAmount) {
      return next(new AppError('Order does not meet the coupon minimum amount', 400));
    }
    discountPrice = promotion.type === 'percentage'
      ? roundCurrency((promotion.value / 100) * itemsPrice)
      : Math.min(promotion.value, itemsPrice);
  }
  const shippingPrice = SHIPPING_PRICE;
  const totalPrice = roundCurrency(itemsPrice + taxPrice + shippingPrice - discountPrice);
  if (totalPrice <= 0) {
    return next(new AppError('Order total must be greater than zero', 400));
  }

  const firstProduct = productsById.get(String(orderItems[0].product));
  const orderId = await generateOrderId(firstProduct.category, Category);
  const order = new Order({
    orderId,
    user: req.user._id,
    orderItems: normalizedItems,
    shippingAddress,
    paymentMethod,
    taxPrice,
    shippingPrice,
    discountPrice,
    totalPrice,
  });

  const reservedProducts = [];
  let createdOrder;
  let promotionUsageReserved = false;
  try {
    createdOrder = await order.save();
    for (const [productId, quantity] of quantitiesByProduct) {
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: productId, quantity: { $gte: quantity } },
        { $inc: { quantity: -quantity, sold: quantity } },
        { new: true }
      );
      if (!updatedProduct) {
        throw new AppError('Product stock changed during checkout. Please try again.', 409);
      }
      reservedProducts.push({ productId, quantity });
    }
    if (promotion) {
      const updatedPromotion = await Promotion.findOneAndUpdate(
        {
          _id: promotion._id,
          isActive: true,
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() },
          $or: [
            { usageLimit: null },
            { usageLimit: { $exists: false } },
            { $expr: { $lt: ['$usedCount', '$usageLimit'] } },
          ],
        },
        { $inc: { usedCount: 1 } },
        { new: true }
      );
      if (!updatedPromotion) {
        throw new AppError('Coupon usage limit has been reached or coupon expired', 400);
      }
      promotionUsageReserved = true;
    }
  } catch (error) {
    await Promise.all(
      reservedProducts.map(({ productId, quantity }) =>
        Product.updateOne(
          { _id: productId },
          { $inc: { quantity, sold: -quantity } }
        )
      )
    );
    if (promotionUsageReserved) {
      await Promotion.updateOne(
        { _id: promotion._id },
        { $inc: { usedCount: -1 } }
      );
    }
    if (createdOrder) await Order.deleteOne({ _id: createdOrder._id });
    throw error;
  }

  try {
    const admins = await User.find({ role: { $regex: /^admin$/i } }).select('_id');
    if (admins.length > 0) {
      await Notification.insertMany(
        admins.map((admin) => ({
          user: admin._id,
          order: createdOrder._id,
          type: 'order',
          status: createdOrder.status,
          message: `New order #${createdOrder._id} has been placed.`,
        }))
      );
    }
  } catch (error) {
    console.error('Failed to create order notifications:', error.message);
  }

  res.status(201).json({
    status: 'success',
    data: {
      order: createdOrder,
    },
  });
});

export const getOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('Not authorized to view this order', 401));
  }

  res.status(200).json({
    status: 'success',
    data: {
      order,
    },
  });
});

export const getMyOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({ user: req.user._id });

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: {
      orders,
    },
  });
});

export const getAllOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find();

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: {
      orders,
    },
  });
});

export const updateOrderToPaid = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  order.isPaid = true;
  order.paidAt = Date.now();
  order.paymentResult = {
    id: req.body.id,
    status: req.body.status,
    update_time: req.body.update_time,
    email_address: req.body.payer.email_address,
  };

  const updatedOrder = await order.save();

  res.status(200).json({
    status: 'success',
    data: {
      order: updatedOrder,
    },
  });
});

export const updateOrderToDelivered = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  order.isDelivered = true;
  order.deliveredAt = Date.now();
  order.status = 'delivered';

  const updatedOrder = await order.save();

  res.status(200).json({
    status: 'success',
    data: {
      order: updatedOrder,
    },
  });
});

export const generateInvoiceController = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate('user');

  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  

  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('Not authorized to view this invoice', 401));
  }

  const invoice = await generateInvoice(order);

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename=invoice-${order._id}.pdf`,
  });

  res.send(invoice);
});

export const updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status, date } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }
  // Update status and currentStatusDate
  order.status = status;
  order.currentStatusDate = date ? new Date(date) : new Date();
  // Push to statusHistory
  order.statusHistory.push({
    status,
    date: order.currentStatusDate,
    changedBy: req.user._id,
  });
  await order.save();
  // Create notification for user
  await Notification.create({
    user: order.user,
    order: order._id,
    status,
    message: `Your order #${order._id} status changed to ${status}`,
  });
  res.status(200).json({
    status: 'success',
    data: { order },
  });
});

// User-accessible order update (limited actions)
export const updateMyOrder = catchAsync(async (req, res, next) => {
  const { action } = req.body;
  const order = await Order.findById(req.params.id);
  
  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }
  
   // 2) Check if order belongs to user
   if (
    (order.user._id ? order.user._id.toString() : order.user.toString()) !== req.user._id.toString()
  ) {
    return next(new AppError('Not authorized to pay for this order', 401));
  }
  // Check if user owns the order
  // if (order.user.toString() !== req.user._id.toString()) {
  //   return next(new AppError('Not authorized to update this order', 403));
  // }
  
  // Only allow specific actions based on current status
  if (action === 'cancel') {
    // Users can only cancel orders that are still pending
    if (order.status !== 'pending') {
      return next(new AppError('Can only cancel orders that are still pending', 400));
    }
    
    order.status = 'canceled';
    order.currentStatusDate = new Date();
    
    // Add to status history
    order.statusHistory.push({
      status: 'canceled',
      date: order.currentStatusDate,
      changedBy: req.user._id,
    });
    
    // Restore product quantities
    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: +item.quantity, sold: -item.quantity },
      });
    }
    
    await order.save();
    
    // Create notification
    await Notification.create({
      user: order.user,
      order: order._id,
      status: 'canceled',
      message: `Your order #${order._id} has been canceled`,
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Order canceled successfully',
      data: { order },
    });
  } else {
    return next(new AppError('Invalid action. Only "cancel" is allowed', 400));
  }
});

export const deleteOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  
  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }
  
  // Check if user owns the order
  if (
    (order.user._id ? order.user._id.toString() : order.user.toString()) !== req.user._id.toString()
  ) {
    return next(new AppError('Not authorized to delete this order', 403));
  }
  
  // Only allow deleting unpaid orders
  if (order.isPaid) {
    return next(new AppError('Cannot delete paid orders', 400));
  }
  
  await Order.findByIdAndDelete(req.params.id);
  
  res.status(204).json({
    status: 'success',
    data: null,
  });
});
