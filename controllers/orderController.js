// import Order from '../models/Order.js';
import Order from '../models/order.model.js'
import Product from '../models/product.model.js';
import AppError  from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import generateInvoice from '../utils/generateInvoice.js';
import Notification from '../models/notification.model.js';
import Category from '../models/category.model.js';
import { generateOrderId } from '../utils/generateOrderId.js';

export const createOrder = catchAsync(async (req, res, next) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    taxPrice,
    shippingPrice,
  } = req.body;

  if (orderItems && orderItems.length === 0) {
    return next(new AppError('No order items', 400));
  }

  // 1) Calculate prices
  const itemsPrice = orderItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  const totalPrice = itemsPrice + taxPrice + shippingPrice;

  // 2) Check product availability
  for (const item of orderItems) {
    const product = await Product.findById(item.product);
    if (!product) {
      return next(new AppError(`Product not found: ${item.product}`, 404));
    }
    if (product.quantity < item.quantity) {
      return next(
        new AppError(
          `Not enough stock for product: ${product.name}. Only ${product.quantity} available`,
          400
        )
      );
    }
  }

  // Get the category of the first product for order ID generation
  const firstProduct = await Product.findById(orderItems[0].product);
  if (!firstProduct) {
    return next(new AppError('Product not found', 404));
  }

  // Generate unique order ID
  const orderId = await generateOrderId(firstProduct.category, Category);

  // 3) Create order
  const order = new Order({
    orderId,
    user: req.user._id,
    orderItems,
    shippingAddress,
    paymentMethod,
    taxPrice,
    shippingPrice,
    totalPrice,
  });

  // 4) Save order
  const createdOrder = await order.save();

  // 5) Update product quantities
  for (const item of orderItems) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { quantity: -item.quantity, sold: +item.quantity },
    });
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

// Update order payment reference
export const updateOrderPaymentReference = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  
  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }
  
  // Check if user owns the order
  if (
    (order.user._id ? order.user._id.toString() : order.user.toString()) !== req.user._id.toString()
  ) {
    return next(new AppError('Not authorized to update this order', 403));
  }
  
  // Only allow updating payment reference if order is not paid
  if (order.isPaid) {
    return next(new AppError('Cannot update payment reference for paid orders', 400));
  }
  
  order.paymentReference = req.body.paymentReference;
  await order.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      order,
    },
  });
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
