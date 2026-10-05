const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BabyFood = sequelize.define(
  'BabyFood',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    ingredients: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    tips: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    ageGroup: {
      type: DataTypes.ENUM('6 months', '8 months', '10 months', '12 months', '1 year', '2 years', '3 years'),
      allowNull: false,
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Categories',
        key: 'id',
      },
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    prepTime: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    servings: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    nutritionInfo: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    createdById: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = BabyFood;
