/**
 * Generates a unique order ID based on the category name
 * Format: XXX-YY-ZZZZZZZ where:
 * XXX = first 3 letters of category name
 * YY = fixed number for the category
 * ZZZZZZZ = random alphanumeric string
 */
export const generateOrderId = async (categoryId, Category) => {
  // Get category name
  const category = await Category.findById(categoryId);
  if (!category) throw new Error('Category not found');

  // Get first 3 letters of category name
  const categoryPrefix = category.name.substring(0, 3).toUpperCase();
  
  // Get or generate fixed number for category
  const fixedNumber = await getFixedNumberForCategory(category._id, Category);
  const fixedNumberStr = fixedNumber.toString().padStart(2, '0');

  // Generate random string
  const randomStr = generateRandomString(7);

  return `${categoryPrefix}-${fixedNumberStr}-${randomStr}`;
};

/**
 * Gets or generates a fixed number for a category
 */
async function getFixedNumberForCategory(categoryId, Category) {
  const category = await Category.findById(categoryId);
  if (!category.fixedNumber) {
    // If no fixed number exists, generate one and save it
    const lastCategory = await Category.findOne().sort({ fixedNumber: -1 });
    const nextNumber = (lastCategory?.fixedNumber || 0) + 1;
    category.fixedNumber = nextNumber;
    await category.save();
  }
  return category.fixedNumber;
}

/**
 * Generates a random alphanumeric string of given length
 */
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
