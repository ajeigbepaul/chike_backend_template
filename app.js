import express from "express";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import path from "path";

// import AppError from "./utils/AppError.js";
import globalErrorHandler from "./controllers/errorController.js";

// Route imports
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import vendorRoutes from "./routes/vendorRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import AppError from "./utils/AppError.js";
import brandRoutes from "./routes/brandRoutes.js";
import quoteRoutes from "./routes/quoteRoutes.js";
import notificationsRoutes from "./routes/notificationsRoutes.js";
import advertRoutes from "./routes/advertRoutes.js";
import promotionRoutes from "./routes/promotionRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";

// Optionally import arcjet middleware if you want to use it here
// import arcjetMiddleware from './middleware/arcjet.middleware.js';

const app = express();

// 1) GLOBAL MIDDLEWARES

// Improved CORS setup to allow multiple trusted origins
const allowedOrigins = [
  "http://localhost:3000",
  "https://chike-e-frontend.vercel.app",
  "https://www.decorbuildingmaterials.com",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Body parser, reading data from body into req.body
app.use(express.json({ limit: "10kb" }));
// Add after express.json() middleware
app.use((req, res, next) => {
  // Convert flat dimensions to object
  if (
    req.body.dimensions &&
    typeof req.body.dimensions === "object" &&
    !Array.isArray(req.body.dimensions)
  ) {
    req.body.dimensions = {
      length: req.body.dimensions.length,
      width: req.body.dimensions.width,
      height: req.body.dimensions.height,
      unit: req.body.dimensions.unit,
    };
  }

  // Convert flat weight to object
  if (
    req.body.weight &&
    typeof req.body.weight === "object" &&
    !Array.isArray(req.body.weight)
  ) {
    req.body.weight = {
      value: req.body.weight.value,
      unit: req.body.weight.unit,
    };
  }
  next();
});
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// Serving static files
app.use(express.static(path.join(path.resolve(), "public")));

// Compress all responses
app.use(compression());

// Arcjet security middleware (uncomment if needed)
// app.use(arcjetMiddleware);

// Test middleware (optional, remove if not needed)
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 3) ROUTES
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/vendors", vendorRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/wishlist", wishlistRoutes);
app.use("/api/v1/brands", brandRoutes);
app.use("/api/v1/quotes", quoteRoutes);
app.use("/api/v1/notifications", notificationsRoutes);
app.use("/api/v1/adverts", advertRoutes);
app.use("/api/v1/promotions", promotionRoutes);
app.use("/api/v1/test", testRoutes);
app.use("/api/v1/contact", contactRoutes);

// Test route
app.get("/api/v1/testApi", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "API is working!",
    time: req.requestTime,
  });
});

// 4) ERROR HANDLING
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

export default app;
