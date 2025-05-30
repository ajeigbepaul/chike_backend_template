import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Order must belong to a user'],
  },
  orderItems: [
    {
      product: {
        type: mongoose.Schema.ObjectId,
        ref: 'Product',
        required: [true, 'Order item must have a product'],
      },
      quantity: {
        type: Number,
        required: [true, 'Order item must have a quantity'],
        min: [1, 'Quantity must be at least 1'],
      },
      price: {
        type: Number,
        required: [true, 'Order item must have a price'],
      },
      color: String,
      size: String,
    },
  ],
  shippingAddress: {
    type: {
      type: String,
      enum: ['home', 'work', 'other'],
      default: 'home',
    },
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
  },
  billingAddress: {
    type: {
      type: String,
      enum: ['home', 'work', 'other'],
      default: 'home',
    },
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
  },
  paymentMethod: {
    type: String,
    required: [true, 'Please provide payment method'],
    enum: ['card', 'bank-transfer', 'mobile-money', 'paypal'],
  },
  paymentResult: {
    id: String,
    status: String,
    update_time: String,
    email_address: String,
  },
  taxPrice: {
    type: Number,
    required: true,
    default: 0.0,
  },
  shippingPrice: {
    type: Number,
    required: true,
    default: 0.0,
  },
  totalPrice: {
    type: Number,
    required: true,
    default: 0.0,
  },
  isPaid: {
    type: Boolean,
    required: true,
    default: false,
  },
  paidAt: {
    type: Date,
  },
  isDelivered: {
    type: Boolean,
    required: true,
    default: false,
  },
  deliveredAt: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  trackingNumber: String,
  trackingCompany: String,
  trackingUrl: String,
  estimatedDelivery: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Populate user and products when querying orders
orderSchema.pre(/^find/, function (next) {
  this.populate('user', 'name email')
    .populate({
      path: 'orderItems.product',
      select: 'name price imageCover',
    });
  next();
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
