require('dotenv').config();
const { connectDB } = require('./config/database');
const { FingerFood } = require('./models');

// The 10-months starter set from the design. Admin-editable afterwards via
// the "🤏 Finger Foods" tab; findOrCreate is idempotent, so re-running this
// script never overwrites admin edits to existing rows.
const FINGER_FOODS = [
  {
    name: 'Banana Pieces',
    icon: '🍌',
    minAgeMonths: 10,
    description: 'Cut into thick coin shapes or 3cm chunks — soft enough to gum easily.',
  },
  {
    name: 'Avocado Cubes',
    icon: '🥑',
    minAgeMonths: 10,
    description: 'Ripe only — cube into bite-sized pieces. No cooking needed.',
  },
  {
    name: 'Steamed Carrot Sticks',
    icon: '🥕',
    minAgeMonths: 10,
    description: 'Steam for 15–18 min until very soft. Cut into finger-length sticks.',
  },
  {
    name: 'Soft Pear Slices',
    icon: '🍐',
    minAgeMonths: 10,
    description: 'Ripe pear, peeled and sliced. If firm, steam briefly until soft.',
  },
  {
    name: 'Toast Fingers',
    icon: '🍞',
    minAgeMonths: 10,
    description: 'Lightly toasted, cut into soldiers. Can spread thin layer of nut-free butter.',
  },
  {
    name: 'Soft Pasta',
    icon: '🍝',
    minAgeMonths: 10,
    description: 'Cook well beyond al dente until very soft. Short shapes (penne, macaroni) work best.',
  },
  {
    name: 'Sweet Potato Wedges',
    icon: '🍠',
    minAgeMonths: 10,
    description: 'Bake or steam until completely soft. Cut into finger-length pieces.',
  },
  {
    name: 'Broccoli Florets',
    icon: '🥦',
    minAgeMonths: 10,
    description: 'Steam for 8–10 min until very tender. Hold the stalk — easier for baby to grip.',
  },

  // Unlocked at 11 months
  {
    name: 'Cheese Cubes',
    icon: '🧀',
    minAgeMonths: 11,
    description: 'Full-fat mild cheddar — cut into small pea-sized cubes.',
  },
  {
    name: 'Egg Pieces',
    icon: '🥚',
    minAgeMonths: 11,
    description: 'Scrambled or hard-boiled. Cut into small pieces. Never runny yolk.',
  },
  {
    name: 'Soft Chicken Strips',
    icon: '🍗',
    minAgeMonths: 11,
    description: 'Slow-cooked or boiled chicken — shred into thin strips easy to gum.',
  },
  {
    name: 'Green Peas',
    icon: '🫛',
    minAgeMonths: 11,
    description: 'Cooked until very soft. Whole for 11m+ — they will squash easily.',
  },
  {
    name: 'Soft Tomato Pieces',
    icon: '🍅',
    minAgeMonths: 11,
    description: 'Remove skin and seeds. Cut into small quarters.',
  },
  {
    name: 'Kiwi Pieces',
    icon: '🥝',
    minAgeMonths: 11,
    description: 'Peel and cut into small soft cubes. Very ripe only.',
  },

  // Unlocked at 12 months
  {
    name: 'Grape Halves',
    icon: '🍇',
    minAgeMonths: 12,
    description: 'Always cut in half or quarters lengthways — never serve whole.',
  },
  {
    name: 'Flaked Salmon',
    icon: '🐟',
    minAgeMonths: 12,
    description: 'Well-cooked, all bones removed. Flake into small soft pieces.',
  },
  {
    name: 'Corn Kernels',
    icon: '🌽',
    minAgeMonths: 12,
    description: 'Cooked until soft. Serve loose kernels — they squash easily.',
  },
  {
    name: 'Kidney Beans',
    icon: '🫘',
    minAgeMonths: 12,
    description: 'Low-sodium, rinsed and warmed. Squash slightly for easy chewing.',
  },
  {
    name: 'Orange Segments',
    icon: '🍊',
    minAgeMonths: 12,
    description: 'Remove pith, seeds and membrane. Cut segments into small pieces.',
  },
  {
    name: 'Garlic Bread Bits',
    icon: '🥖',
    minAgeMonths: 12,
    description: 'Soft homemade garlic bread — mild garlic, no added salt. Cut into small bits.',
  },
];

const run = async () => {
  try {
    await connectDB();

    let created = 0;
    let existing = 0;

    for (const item of FINGER_FOODS) {
      const [, wasCreated] = await FingerFood.findOrCreate({
        where: { name: item.name },
        defaults: item,
      });
      if (wasCreated) created += 1;
      else existing += 1;
    }

    console.log(`✓ Finger foods seeded: ${created} created, ${existing} already existed (untouched).`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding finger foods:', error);
    process.exit(1);
  }
};

run();
