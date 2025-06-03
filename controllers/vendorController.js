import User from "../models/user.model.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";

export const verifyInvitation = catchAsync(async (req, res, next) => {
  const { token } = req.query;

  if (!token) {
    return next(new AppError("Token is required", 400));
  }

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("Invalid or expired invitation token", 400));
  }

  if (user.isEmailVerified) {
    return next(new AppError("Invitation has already been used", 400));
  }

  res.status(200).json({
    status: "success",
    data: {
      email: user.email,
      name: user.name,
    },
  });
});

export const completeOnboarding = catchAsync(async (req, res, next) => {
  const { token, password, phone, address, bio } = req.body;

  if (!token) {
    return next(new AppError("Token is required", 400));
  }

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("Invalid or expired invitation token", 400));
  }

  if (user.isEmailVerified) {
    return next(new AppError("Invitation has already been used", 400));
  }

  // Update user details
  user.password = password;
  user.passwordConfirm = password;
  user.phone = phone;
  user.address = address;
  user.bio = bio;
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;

  await user.save();

  res.status(200).json({
    status: "success",
    message: "Vendor onboarding completed successfully",
  });
});
