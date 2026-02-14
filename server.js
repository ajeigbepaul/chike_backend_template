import app from "./app.js";
import connectToDatabase from "./database/mongodb.js";
import { PORT, NODE_ENV } from "./config/env.js";

// Handle uncaught exceptions (sync errors)
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  console.error(err.stack);
  process.exit(1);
});

// Define port for the server
const port = PORT || 8000;
let server;

// Implement graceful shutdown
const shutdownGracefully = (signal) => {
  console.log(`${signal} received, shutting down gracefully...`);
  if (server) {
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });

    // Force close if graceful shutdown takes too long
    setTimeout(() => {
      console.error(
        "Could not close connections in time, forcefully shutting down"
      );
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Handle shutdown signals
process.on("SIGTERM", () => shutdownGracefully("SIGTERM"));
process.on("SIGINT", () => shutdownGracefully("SIGINT"));

// Initialize the application
const startServer = async () => {
  try {
    // First connect to the database
    console.log("Connecting to database...");
    await connectToDatabase();

    // Only start the server after successful database connection
    server = app.listen(port, () => {
      console.log(`App running on port ${port}...`);
      console.log(`Environment: ${NODE_ENV || "development"}`);
    });

    // Handle errors in the server
    server.on("error", (error) => {
      console.error("Server error:", error);
      process.exit(1);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections (async errors)
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  console.error(err.stack);

  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Start the application
startServer();

export default app;
