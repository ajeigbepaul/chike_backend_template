import crypto from 'crypto';
import Order from '../models/order.model.js';
import AppError  from '../utils/AppError.js';
import catchAsync  from '../utils/catchAsync.js';
import {
  initializePaystackPayment,
  verifyPaystackPayment,
  initializeFlutterwavePayment,
  verifyFlutterwavePayment,
} from '../services/paymentService.js';

export const initializePayment = catchAsync(async (req, res, next) => {
  const { orderId, paymentGateway } = req.body;

  // 1) Get the order
  const order = await Order.findById(orderId);
  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  // 2) Check if order belongs to user
  if (order.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to pay for this order', 401));
  }

  // 3) Check if order is already paid
  if (order.isPaid) {
    return next(new AppError('Order is already paid', 400));
  }

  // 4) Generate unique reference
  const reference = `order-${order._id}-${Date.now()}`;

  let paymentData;

  // 5) Initialize payment based on selected gateway
  if (paymentGateway === 'paystack') {
    paymentData = await initializePaystackPayment(
      req.user.email,
      order.totalPrice,
      reference,
      {
        order_id: order._id.toString(),
        user_id: req.user._id.toString(),
      }
    );
  } else if (paymentGateway === 'flutterwave') {
    paymentData = await initializeFlutterwavePayment(
      req.user.email,
      order.totalPrice,
      reference,
      {
        order_id: order._id.toString(),
        user_id: req.user._id.toString(),
      }
    );
  } else {
    return next(new AppError('Invalid payment gateway selected', 400));
  }

  // 6) Save payment reference to order
  order.paymentReference = reference;
  await order.save();

  res.status(200).json({
    status: 'success',
    data: {
      paymentData,
    },
  });
});

export const verifyPayment = catchAsync(async (req, res, next) => {
  const { reference, paymentGateway } = req.body;

  // 1) Get the order
  const order = await Order.findOne({ paymentReference: reference });
  if (!order) {
    return next(new AppError('No order found with that payment reference', 404));
  }

  // 2) Check if order belongs to user
  if (order.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to verify this payment', 401));
  }

  // 3) Check if order is already paid
  if (order.isPaid) {
    return next(new AppError('Order is already paid', 400));
  }

  let verificationData;

  // 4) Verify payment based on gateway
  if (paymentGateway === 'paystack') {
    verificationData = await verifyPaystackPayment(reference);

    if (verificationData.data.status !== 'success') {
      return next(new AppError('Payment not successful', 400));
    }
  } else if (paymentGateway === 'flutterwave') {
    verificationData = await verifyFlutterwavePayment(reference);

    if (verificationData.data.status !== 'successful') {
      return next(new AppError('Payment not successful', 400));
    }
  } else {
    return next(new AppError('Invalid payment gateway selected', 400));
  }

  // 5) Update order status
  order.isPaid = true;
  order.paidAt = Date.now();
  order.paymentMethod = paymentGateway;
  order.status = 'processing';

  await order.save();

  res.status(200).json({
    status: 'success',
    data: {
      order,
    },
  });
});

export const webhook = catchAsync(async (req, res, next) => {
  let event;

  // Verify Paystack webhook
  if (req.headers['x-paystack-signature']) {
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(400).send('Invalid signature');
    }

    event = req.body;
  }
  // Verify Flutterwave webhook
  else if (req.headers['verif-hash']) {
    const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
    const signature = req.headers['verif-hash'];

    if (signature !== secretHash) {
      return res.status(400).send('Invalid signature');
    }

    event = req.body;
  } else {
    return res.status(400).send('Unknown webhook');
  }

  // Handle the event
  switch (event.event) {
    // Paystack events
    case 'charge.success':
      const paystackData = event.data;
      await handleSuccessfulPayment(
        paystackData.reference,
        'paystack',
        paystackData
      );
      break;

    // Flutterwave events
    case 'charge.completed':
      const flutterwaveData = event.data;
      if (flutterwaveData.status === 'successful') {
        await handleSuccessfulPayment(
          flutterwaveData.tx_ref,
          'flutterwave',
          flutterwaveData
        );
      }
      break;

    default:
      console.log(`Unhandled event type ${event.event}`);
  }

  res.json({ received: true });
});

const handleSuccessfulPayment = async (reference, gateway, paymentData) => {
  const order = await Order.findOne({ paymentReference: reference });

  if (!order || order.isPaid) return;

  order.isPaid = true;
  order.paidAt = new Date();
  order.paymentMethod = gateway;
  order.status = 'processing';
  order.paymentResult = {
    id: paymentData.id,
    status: paymentData.status,
    update_time: new Date().toISOString(),
    email_address: paymentData.customer ? paymentData.customer.email : null,
  };

  await order.save();
};