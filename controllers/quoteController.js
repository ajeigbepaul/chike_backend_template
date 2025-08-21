import Quote from '../models/quote.model.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import APIFeatures from '../utils/apiFeatures.js';

// Create quote request
export const createQuoteRequest = catchAsync(async (req, res, next) => {
  const {
    productId,
    productName,
    quantity,
    customerName,
    customerEmail,
    customerPhone,
    company,
    message,
    expectedPrice,
    urgency,
    image
  } = req.body;

  if (!productId || !productName || !quantity || !customerName || !customerEmail) {
    return next(new AppError('Please provide all required fields', 400));
  }

  const quote = await Quote.create({
    productId,
    productName,
    quantity,
    customerName,
    customerEmail,
    customerPhone,
    company,
    message,
    expectedPrice,
    urgency,
    image
  });

  res.status(201).json({
    status: 'success',
    data: {
      quote
    }
  });
});

// Get all quote requests with pagination
export const getQuotesForUser = catchAsync(async (req, res, next) => {
  // This is a placeholder for getting the user's email from the request.
  // In a real application, this should be retrieved from an authenticated session.
  const { customerEmail } = req.query;

  if (!customerEmail) {
    return next(new AppError('Customer email is required to fetch quotes.', 400));
  }

  const features = new APIFeatures(Quote.find({ customerEmail }), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const quotes = await features.query;
  const total = await Quote.countDocuments({ customerEmail });

  res.status(200).json({
    status: 'success',
    results: quotes.length,
    data: {
      quotes,
      pagination: {
        total,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        pages: Math.ceil(total / (parseInt(req.query.limit) || 10))
      }
    }
  });
});

export const getAllQuotes = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Quote.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const quotes = await features.query;
  const total = await Quote.countDocuments();

  res.status(200).json({
    status: 'success',
    results: quotes.length,
    data: {
      quotes,
      pagination: {
        total,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        pages: Math.ceil(total / (parseInt(req.query.limit) || 10))
      }
    }
  });
});

// Get specific quote request
export const getQuote = catchAsync(async (req, res, next) => {
  const quote = await Quote.findById(req.params.id).populate('productId');

  if (!quote) {
    return next(new AppError('No quote found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      quote
    }
  });
});

// Update quote status - Admin only
export const updateQuoteStatus = catchAsync(async (req, res, next) => {
  const { status, responseMessage, approvedPrice, approvedQuantity } = req.body;

  if (!status) {
    return next(new AppError('Please provide a status', 400));
  }

  const quote = await Quote.findByIdAndUpdate(
    req.params.id,
    {
      status,
      responseMessage,
      approvedPrice,
      approvedQuantity,
      respondedBy: req.user?._id,
      respondedAt: status !== 'pending' ? Date.now() : undefined
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (!quote) {
    return next(new AppError('No quote found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      quote
    }
  });
});

// Get product quote for a specific customer
export const getProductQuoteForCustomer = catchAsync(async (req, res, next) => {
  const { productId } = req.params;
  const { email } = req.query;

  if (!productId || !email) {
    return next(new AppError('Please provide product ID and customer email', 400));
  }

  const quote = await Quote.findOne({ productId, customerEmail: email });

  res.status(200).json({
    status: 'success',
    data: {
      quote
    }
  });
});

// Add a message to a quote's conversation history
export const addQuoteMessage = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { sender, content } = req.body;

  if (!sender || !content) {
    return next(new AppError('Sender and content are required', 400));
  }

  const quote = await Quote.findById(id);
  if (!quote) {
    return next(new AppError('No quote found with that ID', 404));
  }

  quote.messages.push({
    sender,
    content,
    createdAt: new Date()
  });

  await quote.save();

  const populatedQuote = await Quote.findById(quote._id).populate('productId');

  res.status(200).json({
    status: 'success',
    data: {
      quote: populatedQuote
    }
  });
});