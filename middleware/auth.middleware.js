import { JWT_SECRET } from "../config/env.js";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

/**
 * Authentication middleware to verify user is logged in
 */
const authenticate = async (req, res, next) => {
    try {
        let token;
        // Check if the token is in the Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        } else if (req.cookies.token) {
            // Check if the token is in cookies
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: No token provided",
            });
        }
        
        // Verify the token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // console.log('Decoded JWT:', decoded);
        
        // Find the user by ID
        const user = await User.findById(decoded.id).select("-password -__v");
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User not found",
            });
        }

        // console.log('User from DB:', user);

        // Attach user information to the request object
        req.user = user;
        next(); // Call the next middleware or route handler

    } catch (error) {
        console.error("Error in authentication middleware:", error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Invalid token",
            });
        }
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message || "An unexpected error occurred",
        });
    }
};

/**
 * Authorization middleware to verify user has the required role
 * @param {Array} allowedRoles - Array of roles allowed to access the route
 */
const authorize = (allowedRoles = []) => {
    return (req, res, next) => {
        // Check if user is attached to request (should be done by authenticate middleware first)
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User not authenticated",
            });
        }
        
        // console.log('User role:', req.user.role, 'Allowed roles:', allowedRoles);
        
        // If no roles are specified or user has one of the allowed roles
        if (allowedRoles.length === 0 || allowedRoles.includes(req.user.role)) {
            next();
        } else {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You don't have permission to access this resource",
            });
        }
    };
};

export { authenticate, authorize };
