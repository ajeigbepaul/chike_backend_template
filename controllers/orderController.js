// import Order from '../models/Order.js';
import Order from '../models/order.model.js'
import Product from '../models/product.model.js';
import AppError  from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import generateInvoice from '../utils/generateInvoice.js';

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

  // 3) Create order
  const order = new Order({
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