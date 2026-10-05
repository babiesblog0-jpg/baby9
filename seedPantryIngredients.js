require('dotenv').config();
const { connectDB } = require('./config/database');
const { PantryIngredient } = require('./models');

// Catalog transcribed from the AI Recipe Mixer mockup (pages 5-6, 12-14).
// minAgeMonths drives both the Purées & Mash drag-and-drop age-gating and
// the Finger Foods "New!" badge / grid — same catalog for both tabs.
// This is intentionally editable afterwards via the admin panel's
// "🥕 Pantry Ingredients" tab (findOrCreate below is idempotent, so
// re-running this script never overwrites admin edits to existing rows).
const INGREDIENTS = [
  // Fruits
  { name: 'Apple', icon: '🍎', categoryGroup: 'Fruits', minAgeMonths: 6 },
  { name: 'Banana', icon: '🍌', categoryGroup: 'Fruits', minAgeMonths: 6 },
  { name: 'Mango', icon: '🥭', categoryGroup: 'Fruits', minAgeMonths: 6 },
  { name: 'Pear', icon: '🍐', categoryGroup: 'Fruits', minAgeMonths: 6 },
  { name: 'Avocado', icon: '🥑', categoryGroup: 'Fruits', minAgeMonths: 6 },
  { name: 'Peach', icon: '🍑', categoryGroup: 'Fruits', minAgeMonths: 7 },
  { name: 'Blueberry', icon: '🫐', categoryGroup: 'Fruits', minAgeMonths: 8 },
  { name: 'Strawberry', icon: '🍓', categoryGroup: 'Fruits', minAgeMonths: 8 },
  { name: 'Papaya', icon: '🍈', categoryGroup: 'Fruits', minAgeMonths: 7 },
  { name: 'Apricot', icon: '🍑', categoryGroup: 'Fruits', minAgeMonths: 7 },
  { name: 'Plum', icon: '🟣', categoryGroup: 'Fruits', minAgeMonths: 7 },
  { name: 'Watermelon', icon: '🍉', categoryGroup: 'Fruits', minAgeMonths: 8 },
  { name: 'Coconut', icon: '🥥', categoryGroup: 'Fruits', minAgeMonths: 9 },
  { name: 'Fig', icon: '🟤', categoryGroup: 'Fruits', minAgeMonths: 8 },
  { name: 'Cherry', icon: '🍒', categoryGroup: 'Fruits', minAgeMonths: 9 },
  { name: 'Kiwi', icon: '🥝', categoryGroup: 'Fruits', minAgeMonths: 9 },
  { name: 'Orange', icon: '🍊', categoryGroup: 'Fruits', minAgeMonths: 9 },
  { name: 'Grape', icon: '🍇', categoryGroup: 'Fruits', minAgeMonths: 10 },

  // Vegetables
  { name: 'Sweet Potato', icon: '🍠', categoryGroup: 'Vegetables', minAgeMonths: 6 },
  { name: 'Carrot', icon: '🥕', categoryGroup: 'Vegetables', minAgeMonths: 6 },
  { name: 'Peas', icon: '🫛', categoryGroup: 'Vegetables', minAgeMonths: 6 },
  { name: 'Butternut Squash', icon: '🎃', categoryGroup: 'Vegetables', minAgeMonths: 6 },
  { name: 'Broccoli', icon: '🥦', categoryGroup: 'Vegetables', minAgeMonths: 7 },
  { name: 'Spinach', icon: '🥬', categoryGroup: 'Vegetables', minAgeMonths: 7 },
  { name: 'Zucchini', icon: '🥒', categoryGroup: 'Vegetables', minAgeMonths: 7 },
  { name: 'Pumpkin', icon: '🎃', categoryGroup: 'Vegetables', minAgeMonths: 6 },
  { name: 'Parsnip', icon: '🥕', categoryGroup: 'Vegetables', minAgeMonths: 7 },
  { name: 'Cauliflower', icon: '🥦', categoryGroup: 'Vegetables', minAgeMonths: 8 },
  { name: 'Green Beans', icon: '🫘', categoryGroup: 'Vegetables', minAgeMonths: 8 },
  { name: 'Beetroot', icon: '🍠', categoryGroup: 'Vegetables', minAgeMonths: 8 },
  { name: 'Bell Pepper', icon: '🫑', categoryGroup: 'Vegetables', minAgeMonths: 9 },
  { name: 'Tomato', icon: '🍅', categoryGroup: 'Vegetables', minAgeMonths: 9 },
  { name: 'Leek', icon: '🧅', categoryGroup: 'Vegetables', minAgeMonths: 9 },
  { name: 'Asparagus', icon: '🌱', categoryGroup: 'Vegetables', minAgeMonths: 9 },
  { name: 'Corn', icon: '🌽', categoryGroup: 'Vegetables', minAgeMonths: 10 },
  { name: 'Eggplant', icon: '🍆', categoryGroup: 'Vegetables', minAgeMonths: 8 },

  // Cereals & Grains
  { name: 'Oats', icon: '🥣', categoryGroup: 'Cereals & Grains', minAgeMonths: 6 },
  { name: 'Rice', icon: '🍚', categoryGroup: 'Cereals & Grains', minAgeMonths: 6 },
  { name: 'Quinoa', icon: '🌰', categoryGroup: 'Cereals & Grains', minAgeMonths: 7 },
  { name: 'Ragi (Finger Millet)', icon: '🌾', categoryGroup: 'Cereals & Grains', minAgeMonths: 6 },
  { name: 'Sago', icon: '⚪', categoryGroup: 'Cereals & Grains', minAgeMonths: 7 },
  { name: 'Semolina', icon: '🟡', categoryGroup: 'Cereals & Grains', minAgeMonths: 7 },
  { name: 'Barley', icon: '🌿', categoryGroup: 'Cereals & Grains', minAgeMonths: 8 },
  { name: 'Wheat', icon: '🌾', categoryGroup: 'Cereals & Grains', minAgeMonths: 10 },
  { name: 'Bread / Toast', icon: '🍞', categoryGroup: 'Cereals & Grains', minAgeMonths: 10 },
  { name: 'Pasta', icon: '🍝', categoryGroup: 'Cereals & Grains', minAgeMonths: 9 },

  // Legumes & Lentils
  { name: 'Red Lentils', icon: '🔴', categoryGroup: 'Legumes & Lentils', minAgeMonths: 8 },
  { name: 'Yellow Dal', icon: '🟡', categoryGroup: 'Legumes & Lentils', minAgeMonths: 8 },
  { name: 'Chickpeas', icon: '🟤', categoryGroup: 'Legumes & Lentils', minAgeMonths: 9 },
  { name: 'Moong Dal', icon: '🟢', categoryGroup: 'Legumes & Lentils', minAgeMonths: 8 },
  { name: 'Toor Dal', icon: '🟠', categoryGroup: 'Legumes & Lentils', minAgeMonths: 9 },
  { name: 'Urad Dal', icon: '⚫', categoryGroup: 'Legumes & Lentils', minAgeMonths: 9 },
  { name: 'Kidney Beans', icon: '🫘', categoryGroup: 'Legumes & Lentils', minAgeMonths: 10 },
  { name: 'Black Beans', icon: '⚫', categoryGroup: 'Legumes & Lentils', minAgeMonths: 10 },

  // Proteins
  { name: 'Soft Tofu', icon: '⬜', categoryGroup: 'Proteins', minAgeMonths: 8 },
  { name: 'Egg Yolk', icon: '🥚', categoryGroup: 'Proteins', minAgeMonths: 8 },
  { name: 'Chicken', icon: '🍗', categoryGroup: 'Proteins', minAgeMonths: 9 },
  { name: 'Salmon', icon: '🐟', categoryGroup: 'Proteins', minAgeMonths: 9 },
  { name: 'Paneer', icon: '🧀', categoryGroup: 'Proteins', minAgeMonths: 9 },
  { name: 'Egg (whole)', icon: '🥚', categoryGroup: 'Proteins', minAgeMonths: 10 },
  { name: 'Cheese', icon: '🧀', categoryGroup: 'Proteins', minAgeMonths: 10 },

  // Dairy
  { name: 'Greek Yogurt', icon: '🥛', categoryGroup: 'Dairy', minAgeMonths: 8 },
  { name: 'Butter / Ghee', icon: '🧈', categoryGroup: 'Dairy', minAgeMonths: 8 },
  { name: 'Cottage Cheese', icon: '🧀', categoryGroup: 'Dairy', minAgeMonths: 9 },

  // Herbs & Spices
  { name: 'Cinnamon', icon: '🟤', categoryGroup: 'Herbs & Spices', minAgeMonths: 10 },
  { name: 'Turmeric', icon: '🟡', categoryGroup: 'Herbs & Spices', minAgeMonths: 9 },
  { name: 'Cumin', icon: '🟫', categoryGroup: 'Herbs & Spices', minAgeMonths: 9 },
  { name: 'Ginger', icon: '🫚', categoryGroup: 'Herbs & Spices', minAgeMonths: 9 },
  { name: 'Coriander', icon: '🌿', categoryGroup: 'Herbs & Spices', minAgeMonths: 9 },
  { name: 'Fennel', icon: '🌿', categoryGroup: 'Herbs & Spices', minAgeMonths: 8 },
  { name: 'Garlic', icon: '🧄', categoryGroup: 'Herbs & Spices', minAgeMonths: 9 },
  { name: 'Cardamom', icon: '🟢', categoryGroup: 'Herbs & Spices', minAgeMonths: 10 },
  { name: 'Nutmeg', icon: '🌰', categoryGroup: 'Herbs & Spices', minAgeMonths: 10 },
];

const run = async () => {
  try {
    await connectDB();

    let created = 0;
    let existing = 0;

    for (const item of INGREDIENTS) {
      const [, wasCreated] = await PantryIngredient.findOrCreate({
        where: { name: item.name },
        defaults: item,
      });
      if (wasCreated) created += 1;
      else existing += 1;
    }

    console.log(`✓ Pantry ingredients seeded: ${created} created, ${existing} already existed (untouched).`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding pantry ingredients:', error);
    process.exit(1);
  }
};

run();
