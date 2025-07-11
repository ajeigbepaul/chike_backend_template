// Simple script to fix vendor references in products
// Run this manually if you have products with incorrect vendor references

import mongoose from "mongoose";
import Product from "../models/product.model.js";
import { Vendor } from "../models/vendor.model.js";
import { DB_URL } from "../config/env.js";
// Update this with your MongoDB connection string
// const MONGODB_URI =
//   process.env.MONGODB_URI || "mongodb://localhost:27017/chike";

async function fixVendorReferences() {
  console.log("Script started...");
  try {
    await mongoose.connect(DB_URL);
    console.log("🔧 Fixing vendor references...\n");

    // Get all products
    const products = await Product.find({});
    console.log(`📦 Found ${products.length} products`);

    // Get all vendors
    const vendors = await Vendor.find({});
    console.log(`🏪 Found ${vendors.length} vendors`);

    let updatedCount = 0;
    let errors = [];

    for (const product of products) {
      const currentVendorId = product.vendor?.toString();

      // Check if current vendor ID is a Vendor ID (not User ID)
      const vendorDoc = vendors.find(
        (v) => v._id.toString() === currentVendorId
      );

      if (vendorDoc) {
        // Product.vendor points to Vendor ID, should point to User ID
        console.log(`🔄 Fixing product: ${product.name}`);
        console.log(`   From: ${currentVendorId} (Vendor ID)`);
        console.log(`   To: ${vendorDoc.user} (User ID)`);

        try {
          await Product.findByIdAndUpdate(product._id, {
            vendor: vendorDoc.user,
          });
          updatedCount++;
          console.log(`   ✅ Updated successfully\n`);
        } catch (error) {
          errors.push({
            productId: product._id,
            productName: product.name,
            error: error.message,
          });
          console.log(`   ❌ Error: ${error.message}\n`);
        }
      }
    }

    console.log("📊 SUMMARY:");
    console.log(`✅ Updated products: ${updatedCount}`);
    console.log(`❌ Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log("\n❌ ERRORS:");
      errors.forEach((error) => {
        console.log(`- ${error.productName}: ${error.error}`);
      });
    }
  } catch (error) {
    console.error("❌ Script error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from database");
  }
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixVendorReferences();
}

export default fixVendorReferences;
