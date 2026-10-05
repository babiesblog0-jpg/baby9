const User = require('./User');
const Category = require('./Category');
const BabyFood = require('./BabyFood');
const Blog = require('./Blog');
const ParentingTip = require('./ParentingTip');
const ParentingGallery = require('./ParentingGallery');
const PantryIngredient = require('./PantryIngredient');
const FeaturedDelight = require('./FeaturedDelight');
const FingerFood = require('./FingerFood');
const Product = require('./Product');
const Purchase = require('./Purchase');
const SiteSetting = require('./SiteSetting');

// Associations
// BabyFood belongs to Category
BabyFood.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
Category.hasMany(BabyFood, { foreignKey: 'categoryId', as: 'babyFoods' });

// BabyFood belongs to User (createdBy)
BabyFood.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });
User.hasMany(BabyFood, { foreignKey: 'createdById', as: 'babyFoods' });

// Blog belongs to User (author)
Blog.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
User.hasMany(Blog, { foreignKey: 'authorId', as: 'blogs' });

// Purchase belongs to Product
Purchase.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(Purchase, { foreignKey: 'productId', as: 'purchases' });

// ParentingTip belongs to User (tipAuthor)
ParentingTip.belongsTo(User, { foreignKey: 'authorId', as: 'tipAuthor' });
User.hasMany(ParentingTip, { foreignKey: 'authorId', as: 'parentingTips' });

module.exports = {
  User,
  Category,
  BabyFood,
  Blog,
  ParentingTip,
  ParentingGallery,
  PantryIngredient,
  FeaturedDelight,
  FingerFood,
  Product,
  Purchase,
  SiteSetting,
};
