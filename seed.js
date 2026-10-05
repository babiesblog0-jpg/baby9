require('dotenv').config();
const { connectDB, sequelize } = require('./config/database');

// Import models (sets up associations)
const { User, Category } = require('./models');

const seedDatabase = async () => {
  try {
    await connectDB();

    // Clear existing data (reverse order to respect FK constraints)
    await sequelize.query('TRUNCATE TABLE "BabyFoods" CASCADE');
    await sequelize.query('TRUNCATE TABLE "Blogs" CASCADE');
    await sequelize.query('TRUNCATE TABLE "Categories" CASCADE');
    await sequelize.query('TRUNCATE TABLE "Users" CASCADE');

    // Create admin user
    const adminUser = await User.create({
      email: process.env.ADMIN_EMAIL || 'admin@babyfood.com',
      password: process.env.ADMIN_PASSWORD || 'Admin@123456',
      name: 'Admin User',
      role: 'admin',
      isActive: true,
    });

    console.log('✓ Admin user created:', adminUser.email);

    // Default categories — these also power the "Heading" dropdown when
    // adding a Pantry Ingredient, so they match the pantry catalog's groups.
    const categoriesData = [
      { name: 'Fruits' },
      { name: 'Vegetables' },
      { name: 'Cereals & Grains' },
      { name: 'Legumes & Lentils' },
      { name: 'Proteins' },
      { name: 'Dairy' },
      { name: 'Herbs & Spices' },
    ];

    const categories = await Category.bulkCreate(categoriesData);

    console.log('✓ Categories created:', categories.length);
    console.log('\n✓ Database seeded successfully!');
    console.log('\nAdmin Credentials:');
    console.log('Email:', adminUser.email);
    console.log('Password:', process.env.ADMIN_PASSWORD || 'Admin@123456');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
