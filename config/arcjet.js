import arcjet, { shield, detectBot, tokenBucket } from "@arcjet/node";
import { ARCJET_KEY } from "./env.js";
// export const arcjetConfig = {
//   env: process.env.ARCJET_ENV || "development",
//   key: process.env.ARCJET_KEY || "your-arcjet-key", 
//     shield: {
//         enabled: true,
//         maxRequests: 100, // Maximum requests per minute
//         windowMs: 60 * 1000, // Time window in milliseconds
//         message: "Too many requests, please try again later.",
//     },
//     detectBot: {
//         enabled: true,
//         allowlist: ["googlebot", "bingbot"], // Allowlist for known bots
//         blocklist: ["badbot"], // Blocklist for known bad bots
//     },
//     tokenBucket: {
//         enabled: true,
//         capacity: 100, // Maximum tokens in the bucket
//         refillRate: 10, // Tokens added per second
//         refillInterval: 1000, // Time interval for refilling tokens in milliseconds
//     },
//     isSpoofedBot: {
//         enabled: true,
//         allowlist: ["googlebot", "bingbot"], // Allowlist for known bots
//         blocklist: ["badbot"], // Blocklist for known bad bots
//     },
// };

const aj = arcjet({
  // Get your site key from https://app.arcjet.com and set it as an environment
  // variable rather than hard coding.
  key: ARCJET_KEY,
  characteristics: ["ip.src"], // Track requests by IP
  rules: [
    // Shield protects your app from common attacks e.g. SQL injection
    shield({ mode: "LIVE" }),
    // Create a bot detection rule
    detectBot({
      mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
      // Block all bots except the following
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
        // Uncomment to allow these other common bot categories
        // See the full list at https://arcjet.com/bot-list
        //"CATEGORY:MONITOR", // Uptime monitoring services
        //"CATEGORY:PREVIEW", // Link previews e.g. Slack, Discord
      ],
    }),
    // Create a token bucket rate limit. Other algorithms are supported.
    tokenBucket({
      mode: "LIVE",
      refillRate: 5, // Refill 5 tokens per interval
      interval: 10, // Refill every 10 seconds
      capacity: 10, // Bucket capacity of 10 tokens
    }),
  ],
});

export default aj;