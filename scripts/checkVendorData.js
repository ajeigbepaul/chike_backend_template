import mongoose from "mongoose";
import Product from "../models/product.model.js";
import { Vendor } from "../models/vendor.model.js";
import User from "../models/user.model.js";

// Connect to MongoDB (adjust connection string as needed)
mongoose.connect("mongodb://localhost:27017/chike", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function checkVendorData() {
  try {
    console.log("🔍 Checking vendor data consistency...\n");

    // Get all products
    const products = await Product.find({}).select("_id name vendor");
    console.log(`📦 Found ${products.length} products`);

    // Get all vendors
    const vendors = await Vendor.find({}).select("_id user businessName");
    console.log(`🏪 Found ${vendors.length} vendors`);

    // Get all users
    const users = await User.find({}).select("_id name email");
    console.log(`👥 Found ${users.length} users\n`);

    // Check each product
    let inconsistentProducts = [];
    let consistentProducts = [];

    for (const product of products) {
      const vendorId = product.vendor?.toString();

      // Check if vendor field points to a User
      const user = users.find((u) => u._id.toString() === vendorId);

      // Check if vendor field points to a Vendor
      const vendor = vendors.find((v) => v._id.toString() === vendorId);

      if (user) {
        // Product.vendor points to a User - this is correct
        const vendorDoc = vendors.find((v) => v.user.toString() === vendorId);
        if (vendorDoc) {
          consistentProducts.push({
            productId: product._id,
            productName: product.name,
            vendorId: vendorId,
            vendorName: vendorDoc.businessName || user.name,
            status: "✅ Correct",
          });
        } else {
          inconsistentProducts.push({
            productId: product._id,
            productName: product.name,
            vendorId: vendorId,
            issue: "❌ User exists but no Vendor document found",
            status: "NEEDS_VENDOR_DOC",
          });
        }
      } else if (vendor) {
        // Product.vendor points to a Vendor - this needs to be fixed
        inconsistentProducts.push({
          productId: product._id,
          productName: product.name,
          vendorId: vendorId,
          correctVendorId: vendor.user.toString(),
          issue: "❌ Points to Vendor ID instead of User ID",
          status: "NEEDS_UPDATE",
        });
      } else {
        // Product.vendor points to nothing
        inconsistentProducts.push({
          productId: product._id,
          productName: product.name,
          vendorId: vendorId,
          issue: "❌ Invalid vendor reference",
          status: "INVALID_REFERENCE",
        });
      }
    }

    console.log("📊 ANALYSIS RESULTS:\n");
    console.log(`✅ Consistent products: ${consistentProducts.length}`);
    console.log(`❌ Inconsistent products: ${inconsistentProducts.length}\n`);

    if (inconsistentProducts.length > 0) {
      console.log("🔧 INCONSISTENT PRODUCTS:");
      inconsistentProducts.forEach((item, index) => {
        console.log(`${index + 1}. ${item.productName} (${item.productId})`);
        console.log(`   Current vendor: ${item.vendorId}`);
        if (item.correctVendorId) {
          console.log(`   Should be: ${item.correctVendorId}`);
        }
        console.log(`   Issue: ${item.issue}\n`);
      });
    }

    if (consistentProducts.length > 0) {
      console.log("✅ CONSISTENT PRODUCTS (first 5):");
      consistentProducts.slice(0, 5).forEach((item, index) => {
        console.log(`${index + 1}. ${item.productName} -> ${item.vendorName}`);
      });
      if (consistentProducts.length > 5) {
        console.log(`   ... and ${consistentProducts.length - 5} more`);
      }
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

checkVendorData();
