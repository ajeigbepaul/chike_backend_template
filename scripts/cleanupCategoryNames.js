// scripts/cleanupCategoryNames.js
import mongoose from 'mongoose';
import Category from '../models/category.model.js';
import {DB_URL} from '../config/env.js'
// const {MONGO_URI} = 'mongodb://localhost:27017/YOUR_DB_NAME'; // <-- Change this!

async function cleanupCategoryNames() {
  await mongoose.connect(DB_URL);

  const categories = await Category.find();
  for (const category of categories) {
    // If the name contains '>', split and take the last part, else keep as is
    const cleanName = category.name.includes('>') 
      ? category.name.split('>').pop().trim()
      : category.name.trim();

    if (category.name !== cleanName) {
      category.name = cleanName;
      await category.save();
      console.log(`Updated: ${category._id} to "${cleanName}"`);
    }
  }

  await mongoose.disconnect();
  console.log('Category name cleanup complete!');
}

cleanupCategoryNames().catch(err => {
  console.error(err);
  process.exit(1);
});