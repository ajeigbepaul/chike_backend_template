const mongoose = require("mongoose");
const Product = require("../models/product.model.js");
const { Vendor } = require("../models/vendor.model.js");

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/chike", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function fixVendorReferences() {
  try {
    console.log("🔧 Starting vendor reference fix...\n");

    // Get all products
    const products = await Product.find({});
    console.log(`📦 Found ${products.length} products`);

    // Get all vendors
    const vendors = await Vendor.find({});
    console.log(`🏪 Found ${vendors.length} vendors\n`);

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
      } else {
        console.log(
          `✅ Product "${product.name}" already has correct vendor reference\n`
        );
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

// Run the script
fixVendorReferences();
