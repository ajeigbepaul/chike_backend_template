import axios from 'axios';
import AppError from '../utils/AppError.js';
import { PAYSTACK_SECRET_KEY } from '../config/env.js';

// Paystack integration
export const initializePaystackPayment = async (email, amount, reference, metadata = {}) => {
  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: amount * 100, // Paystack uses amount in kobo
        reference,
        metadata,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Paystack initialization error:', error.response ? error.response.data : error.message);
    throw new AppError('Payment initialization failed', 500);
  }
};

export async function verifyPaystackPayment(reference) {
  try {
    console.log('Verifying Paystack payment with reference:', reference);
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
    });
    console.log('Paystack verification response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Paystack verification error:', error.response ? error.response.data : error.message);
    throw new AppError('Payment verification failed', 500);
  }
}

// Flutterwave integration
export const initializeFlutterwavePayment = async (email, amount, reference, metadata = {}) => {
  try {
    const response = await axios.post(
      'https://api.flutterwave.com/v3/payments',
      {
        tx_ref: reference,
        amount,
        currency: 'NGN',
        payment_options: 'card, banktransfer, ussd',
        redirect_url: `${process.env.FRONTEND_URL}/payment/verify`,
        meta: metadata,
        customer: {
          email,
        },
        customizations: {
          title: 'E-commerce Store',
          description: 'Payment for items in cart',
          logo: process.env.LOGO_URL,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Flutterwave initialization error:', error.response ? error.response.data : error.message);
    throw new AppError('Payment initialization failed', 500);
  }
};

export const verifyFlutterwavePayment = async (transactionId) => {
  try {
    const response = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Flutterwave verification error:', error.response ? error.response.data : error.message);
    throw new AppError('Payment verification failed', 500);
  }
};

// Exporting the functions for use in other parts of the application
export default {
  initializePaystackPayment,
  verifyPaystackPayment,
  initializeFlutterwavePayment,
  verifyFlutterwavePayment,
};