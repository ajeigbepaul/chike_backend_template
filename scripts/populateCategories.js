import mongoose from 'mongoose';
import { config } from 'dotenv';
import Category from '../models/category.model.js';
import { DB_URL, NODE_ENV } from '../config/env.js';

// Load environment variables
config({ path: `.env.${NODE_ENV || "development"}.local` });

// Connection options for better reliability
const connectionOptions = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  family: 4
};

const categories = [
  {
    name: 'Indoor',
    order: 1,
    subcategories: [
      {
        name: 'Bathroom',
        order: 1,
        subcategories: [
          {
            name: 'Cabinets & Components',
            order: 1
          }
        ]
      },
      {
        name: 'Kitchen',
        order: 2,
        subcategories: [
          {
            name: 'Cabinets & Components',
            order: 1,
            subcategories: [
              { name: 'Base cabinets', order: 1 },
              { name: 'Wall cabinets', order: 2 },
              { name: 'Corner cabinets', order: 3 },
              { name: 'Cabinet doors and panels', order: 4 },
              { name: 'Cabinet handles & knobs', order: 5 },
              { name: 'Soft-close hinges & drawer slides', order: 6 }
            ]
          },
          {
            name: 'Countertops',
            order: 2,
            subcategories: [
              { name: 'Granite countertops', order: 1 },
              { name: 'Quartz countertops', order: 2 },
              { name: 'Marble countertops', order: 3 },
              { name: 'Laminate countertops', order: 4 },
              { name: 'Solid surface countertops', order: 5 },
              { name: 'Countertop edges and trims', order: 6 }
            ]
          },
          {
            name: 'Sinks & Accessories',
            order: 3,
            subcategories: [
              { name: 'Single-bowl sinks', order: 1 },
              { name: 'Double-bowl sinks', order: 2 },
              { name: 'Under-mount sinks', order: 3 },
              { name: 'Top-mount sinks', order: 4 },
              { name: 'Stainless steel sinks', order: 5 },
              { name: 'Composite granite sinks', order: 6 },
              { name: 'Sink strainers & baskets', order: 7 },
              { name: 'Sink taps & mixers', order: 8 },
              { name: 'Drainage fittings', order: 9 }
            ]
          },
          {
            name: 'Faucets & Fixtures',
            order: 4,
            subcategories: [
              { name: 'Single-handle faucets', order: 1 },
              { name: 'Pull-out/pull-down faucets', order: 2 },
              { name: 'Wall-mounted faucets', order: 3 },
              { name: 'Water purifiers and dispensers', order: 4 },
              { name: 'Touchless sensor faucets', order: 5 }
            ]
          },
          {
            name: 'Lighting',
            order: 5,
            subcategories: [
              { name: 'Under-cabinet lighting', order: 1 },
              { name: 'Pendant lights', order: 2 },
              { name: 'Recessed ceiling lights', order: 3 },
              { name: 'LED strip lights', order: 4 },
              { name: 'Task lighting fixtures', order: 5 }
            ]
          },
          {
            name: 'Ventilation',
            order: 6,
            subcategories: [
              { name: 'Range hoods', order: 1 },
              { name: 'Ducting kits', order: 2 },
              { name: 'Vent grilles & covers', order: 3 }
            ]
          },
          {
            name: 'Flooring',
            order: 7,
            subcategories: [
              { name: 'Ceramic floor tiles', order: 1 },
              { name: 'Vinyl flooring', order: 2 },
              { name: 'Waterproof laminate', order: 3 },
              { name: 'Anti-slip kitchen mats', order: 4 }
            ]
          },
          {
            name: 'Storage Solutions',
            order: 8,
            subcategories: [
              { name: 'Pull-out shelves', order: 1 },
              { name: 'Lazy Susans', order: 2 },
              { name: 'Spice racks', order: 3 },
              { name: 'Waste sorting systems', order: 4 },
              { name: 'Dish drying racks', order: 5 }
            ]
          }
        ]
      },
      {
        name: 'Doors',
        order: 3
      },
      {
        name: 'Curtains & Windows Blinds',
        order: 4,
        subcategories: [
          {
            name: 'Curtains',
            order: 1,
            subcategories: [
              { name: 'Smart Curtains', order: 1 },
              { name: 'Rod Pocket Curtains', order: 2 }
            ]
          },
          {
            name: 'Windows Blinds',
            order: 2
          },
          {
            name: 'Curtain Accessories & Fittings',
            order: 3
          }
        ]
      },
      {
        name: 'Furniture',
        order: 5,
        subcategories: [
          { name: 'Bedroom', order: 1 },
          { name: 'Dining Room', order: 2 },
          { name: 'Sitting Room', order: 3 },
          { name: 'Kitchen', order: 4 },
          { name: 'Lounge', order: 5 },
          { name: 'Office', order: 6 },
          { name: 'Bar', order: 7 }
        ]
      },
      {
        name: 'Tiles',
        order: 6
      },
      {
        name: 'Ceiling',
        order: 7
      },
      {
        name: 'Lighting',
        order: 8
      },
      {
        name: 'Handrails and Banisters',
        order: 9
      },
      {
        name: 'Wall Décor',
        order: 10
      }
    ]
  },
  {
    name: 'Outdoor',
    order: 2,
    subcategories: [
      {
        name: 'Gates',
        order: 1,
        subcategories: [
          { name: 'Electronic gate', order: 1 },
          { name: 'PreFab. gate', order: 2 },
          { name: 'Stainless gate', order: 3 },
          { name: 'Pre-Order gate', order: 4 }
        ]
      },
      {
        name: 'Table and Chair',
        order: 2,
        subcategories: [
          { name: 'Classic chair', order: 1 },
          { name: 'Table', order: 2 }
        ]
      },
      {
        name: 'Doors',
        order: 3,
        subcategories: [
          { name: 'Security doors', order: 1 },
          { name: 'Steel doors', order: 2 },
          { name: 'Wooden/MDF doors', order: 3 },
          { name: 'Pivot doors', order: 4 },
          { name: 'Glass door', order: 5 },
          { name: 'Smart doors', order: 6 },
          { name: 'Door Fittings and Accessories', order: 7 }
        ]
      },
      {
        name: 'Windows',
        order: 4
      },
      {
        name: 'Flooring',
        order: 5
      },
      {
        name: 'Roofing',
        order: 6
      },
      {
        name: 'Water Tanks & Reservoirs',
        order: 7
      },
      {
        name: 'Lighting',
        order: 8
      },
      {
        name: 'Bollard Barriers',
        order: 9
      },
      {
        name: 'Handrails and Banisters',
        order: 10
      },
      {
        name: 'Car park Tents and Pergolas',
        order: 11
      }
    ]
  },
  {
    name: 'Construction',
    order: 3,
    subcategories: [
      {
        name: 'Wood & Panel',
        order: 1,
        subcategories: [
          {
            name: 'Wood',
            order: 1,
            subcategories: [
              { name: 'Whitewood', order: 1 },
              { name: 'Hardwood', order: 2 }
            ]
          },
          {
            name: 'Panel',
            order: 2,
            subcategories: [
              { name: 'MDF', order: 1 },
              { name: 'Door Core', order: 2 },
              { name: 'Plywood', order: 3 },
              { name: 'Boards', order: 4 }
            ]
          }
        ]
      },
      {
        name: 'Metals',
        order: 2,
        subcategories: [
          {
            name: 'Steel',
            order: 1,
            subcategories: [
              { name: 'Stainless Steel', order: 1 },
              { name: 'Aluminium Steel', order: 2 },
              { name: 'Galvanize Steel', order: 3 },
              { name: 'Angle Steel Beam', order: 4 }
            ]
          },
          {
            name: 'Iron bar',
            order: 2,
            subcategories: [
              { name: 'Ribbed Reinforcement Iron', order: 1 },
              { name: 'Mild smooth Iron', order: 2 }
            ]
          },
          {
            name: 'Wrought Iron',
            order: 3,
            subcategories: [
              { name: 'Wrought Iron', order: 1 }
            ]
          }
        ]
      },
      {
        name: 'Plumbing & Drainage',
        order: 3,
        subcategories: [
          {
            name: 'PVC Pipes',
            order: 1,
            subcategories: [
              { name: 'U-PVC', order: 1 },
              { name: 'PVC', order: 2 }
            ]
          },
          {
            name: 'Plumbing Accessories',
            order: 2,
            subcategories: [
              { name: 'PVC Fittings', order: 1 }
            ]
          }
        ]
      },
      {
        name: 'Cement, Sand and Granite',
        order: 4,
        subcategories: [
          {
            name: 'Cements',
            order: 1,
            subcategories: [
              { name: 'BUA', order: 1 },
              { name: 'Dangote', order: 2 },
              { name: 'Lafarge', order: 3 },
              { name: 'Huaxin', order: 4 }
            ]
          },
          {
            name: 'Sand',
            order: 2,
            subcategories: [
              { name: 'Sharp sand', order: 1 },
              { name: 'Plaster sand', order: 2 },
              { name: 'Laterite', order: 3 }
            ]
          },
          {
            name: 'Granite/Stones',
            order: 3
          }
        ]
      }
    ]
  }
];

async function createCategory(categoryData, parentId = null, parentPath = []) {
  // Create a unique name by combining with parent path
  const uniqueName = parentPath.length > 0 
    ? `${parentPath.join(' > ')} > ${categoryData.name}`
    : categoryData.name;

  const category = await Category.create({
    name: uniqueName,
    order: categoryData.order,
    parent: parentId,
    isActive: true
  });

  if (categoryData.subcategories) {
    for (const subcategory of categoryData.subcategories) {
      await createCategory(subcategory, category._id, [...parentPath, categoryData.name]);
    }
  }

  return category;
}

async function populateCategories() {
  try {
    // Check if DB_URL is defined
    if (!DB_URL) {
      throw new Error("DB_URL is not defined in the environment variables.");
    }

    await mongoose.connect(DB_URL, connectionOptions);
    console.log(`Connected to MongoDB in ${NODE_ENV} mode`);

    // Clear existing categories
    await Category.deleteMany({});
    console.log('Cleared existing categories');

    // Create new categories
    for (const category of categories) {
      await createCategory(category);
    }

    console.log('Categories populated successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error populating categories:', error);
    process.exit(1);
  }
}

populateCategories(); 