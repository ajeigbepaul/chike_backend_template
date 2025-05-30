import { JWT_SECRET } from "../config/env.js";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
const authorize = (req, res, next) => {
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
        const user = User.findById(decoded.userId).select("-password -__v");
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User not found",
            });
        }

        req.user = user; // Attach user information to the request object
        next(); // Call the next middleware or route handler
        // Attach user information to the request object

    } catch (error) {
        console.error("Error in authorization middleware:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message || "An unexpected error occurred",
        });
        
    }
}
export default authorize;