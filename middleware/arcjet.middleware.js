import aj from "../config/arcjet.js";

const arcjetMiddleware = async (req, res, next) => {
    try {
        const decision = await aj.protect(req,{requested:1})
        if(decision.isDenied()){
            if(decision.reason.isRateLimit()) {
                res.status(429).json({
                    success: false,
                    message: "Rate limit exceeded. Please try again later."
                });
            }
            if(decision.reason.isBot()) {
                res.status(403).json({
                    success: false,
                    message: "Access denied for bots."
                });
            }
            if(decision.reason.isAbuse()) {
                res.status(403).json({
                    success: false,
                    message: "Access denied due to abuse detection."
                });
            }
            if(decision.reason.isFraud()) {
                res.status(403).json({
                    success: false,
                    message: "Access denied due to fraud detection."
                });
            }
            if(decision.reason.isMalware()) {
                res.status(403).json({
                    success: false,
                    message: "Access denied due to malware detection."
                });
            }
            if(decision.reason.isSuspicious()) {
                res.status(403).json({
                    success: false,
                    message: "Access denied due to suspicious activity."
                });
            }
            return res.status(403).json({
                success: false,
                message: "Access denied."
            });
        }

        // If the request is allowed, proceed to the next middleware or route handler
        next();
    } catch (error) {
        console.error("Error in Arcjet middleware:", error);
        // Handle the error and send a response
        next(error); // Pass the error to the next middleware or error handler
        // res.status(500).json({
        //     success: false,
        //     message: "Internal Server Error",
        //     error: error.message || "An unexpected error occurred",
        // });
        
    }
}
export default arcjetMiddleware;