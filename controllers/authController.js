import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { promisify } from "util";
// import User model
import User from "../models/user.model.js"; // Adjust the import path as necessary
// import User from '../models/User.js';
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import { generateOTP, sendOTPEmail } from "../services/otpService.js";
import sendEmail from "../config/email.js";
import {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_COOKIE_EXPIRES_IN,
  NODE_ENV,
} from "../config/env.js";

const signToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: NODE_ENV === "production",
  };

  res.cookie("jwt", token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

export const register = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm, phone } = req.body;

  // Hash password with bcryptjs
  if (password !== passwordConfirm) {
    return next(new AppError("Passwords do not match", 400));
  }
  const hashedPassword = await bcrypt.hash(password, 12);

  const newUser = await User.create({
    name,
    email,
    password: hashedPassword,
    passwordConfirm: hashedPassword,
    phone,
  });

  // Generate email verification token
  const verificationToken =
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
  console.log("Generated verification token:", verificationToken);

  newUser.emailVerificationToken = await bcrypt.hash(verificationToken, 12);
  newUser.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  await newUser.save({ validateBeforeSave: false });

  // Send verification email
  const verificationUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/auth/verify-email/${encodeURIComponent(verificationToken)}`;
  console.log("Verification URL:", verificationUrl);

  const message = `Please verify your email by clicking on this link: ${verificationUrl}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Email Verification</h2>
      <p>Please click the button below to verify your email address:</p>
      <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0;">Verify Email</a>
      <p>If you didn't create an account, please ignore this email.</p>
    </div>
  `;

  try {
    await sendEmail({
      email: newUser.email,
      subject: "Your email verification token (valid for 24 hours)",
      message,
      html,
    });

    res.status(201).json({
      status: "success",
      message: "Verification token sent to email!",
    });
  } catch (err) {
    console.error("Error sending verification email:", err);
    newUser.emailVerificationToken = undefined;
    newUser.emailVerificationExpires = undefined;
    await newUser.save({ validateBeforeSave: false });

    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }
});

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError("Please provide email and password!", 400));
  }

  // 2) Check if user exists && password is correct
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // 3) Check if email is verified
  if (!user.isEmailVerified) {
    return next(new AppError("Please verify your email first", 401));
  }

  // 4) If everything ok, send token to client
  createSendToken(user, 200, res);
});

export const verifyEmail = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const verificationToken = decodeURIComponent(req.params.token);
  console.log("Received verification token:", verificationToken);

  const users = await User.find({
    emailVerificationExpires: { $gt: Date.now() },
  });
  console.log("Found users with valid expiration:", users.length);

  let user = null;
  for (const u of users) {
    try {
      const isMatch = await bcrypt.compare(
        verificationToken,
        u.emailVerificationToken
      );
      console.log("Token comparison result:", isMatch);
      if (isMatch) {
        user = u;
        console.log("Found matching user:", u.email);
        break;
      }
    } catch (err) {
      console.error("Error comparing tokens:", err);
    }
  }

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    console.log("No matching user found for token");
    return res.redirect(
      `${process.env.FRONTEND_URL}/auth/signin?error=invalid_token`
    );
  }

  // 3) Update user's email verification status
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  // 4) Redirect to frontend login page with success message
  res.redirect(`${process.env.FRONTEND_URL}/auth/signin?verified=true`);
});

export const forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("There is no user with that email address.", 404));
  }

  // 2) Generate the random reset token (using bcrypt)
  const resetToken = await bcrypt.genSalt(16);
  user.passwordResetToken = await bcrypt.hash(resetToken, 12);
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/auth/reset-password/${encodeURIComponent(resetToken)}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset token (valid for 10 min)",
      message,
    });

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }
});

export const resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const resetToken = req.params.token;
  const users = await User.find({
    passwordResetExpires: { $gt: Date.now() },
  });

  let user = null;
  for (const u of users) {
    if (await bcrypt.compare(resetToken, u.passwordResetToken)) {
      user = u;
      break;
    }
  }

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }
  if (req.body.password !== req.body.passwordConfirm) {
    return next(new AppError("Passwords do not match", 400));
  }
  user.password = await bcrypt.hash(req.body.password, 12);
  user.passwordConfirm = user.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user
  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

export const sendOTP = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError("Please provide an email address", 400));
  }

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError("No user found with that email", 404));
  }

  const otp = generateOTP();
  user.otp = otp;
  user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  await user.save({ validateBeforeSave: false });

  await sendOTPEmail(email, otp);

  res.status(200).json({
    status: "success",
    message: "OTP sent to email",
  });
});

export const verifyOTP = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return next(new AppError("Please provide email and OTP", 400));
  }

  const user = await User.findOne({
    email,
    otp,
    otpExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("OTP is invalid or has expired", 400));
  }

  // Clear OTP fields
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save({ validateBeforeSave: false });

  // Log the user in
  createSendToken(user, 200, res);
});

export const protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError("The user belonging to this token no longer exists.", 401)
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
};
