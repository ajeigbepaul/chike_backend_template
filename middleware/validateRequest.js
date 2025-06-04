import { validationResult } from "express-validator";

/**
 * Middleware to validate request using express-validator
 * If there are validation errors, it will return a 400 status with the errors
 * If there are no errors, it will proceed to the next middleware
 */
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
      })),
    });
  }
  next();
};
