import { NODE_ENV, DB_URL } from "../config/env.js";
import mongoose from "mongoose";

// Check if DB_URL is defined
if (!DB_URL) {
  throw new Error("DB_URL is not defined in the environment variables.");
}

// Connection options for better reliability
const connectionOptions = {
  serverSelectionTimeoutMS: 10000, // Timeout after 10 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4 // Use IPv4, skip trying IPv6
};

// Maximum number of connection retries
const MAX_RETRIES = 3;

/**
 * Connect to MongoDB with retry logic
 */
const connectToDatabase = async (retryCount = 0) => {
  try {
    // Attempt to connect to MongoDB
    await mongoose.connect(DB_URL, connectionOptions);
    
    console.log(`Connected to MongoDB in ${NODE_ENV} mode`);
    
    // Set up connection event listeners for monitoring
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.info('MongoDB reconnected successfully');
    });
    
    // Handle application termination gracefully
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed due to application termination');
        process.exit(0);
      } catch (err) {
        console.error('Error during MongoDB disconnect:', err);
        process.exit(1);
      }
    });
    
  } catch (error) {
    // Implement retry logic
    if (retryCount < MAX_RETRIES) {
      console.warn(`MongoDB connection attempt ${retryCount + 1} failed. Retrying in 5 seconds...`);
      console.error('Connection error details:', error.message);
      
      // Wait 5 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Retry connection with incremented retry count
      return connectToDatabase(retryCount + 1);
    }
    
    // If max retries reached, log detailed error and exit
    console.error("Failed to connect to MongoDB after multiple attempts:");
    console.error(`- Error name: ${error.name}`);
    console.error(`- Error message: ${error.message}`);
    console.error(`- DB URL (redacted): ${DB_URL.replace(/\/\/([^:]+):([^@]+)@/, '//****:****@')}`);
    console.error(`- Node environment: ${NODE_ENV}`);
    
    // Exit with error code
    process.exit(1);
  }
};

export default connectToDatabase;
