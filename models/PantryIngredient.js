const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PantryIngredient = sequelize.define(
  'PantryIngredient',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    // Emoji icon (used when no image is uploaded)
    icon: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    // Uploaded R2 image URL (takes precedence over icon when present)
    image: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    // Heading — matches a Category's name (populated from the Categories
    // section in admin), stored as plain text since PantryIngredient has no
    // FK to Category.
    categoryGroup: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    minAgeMonths: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 6,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = PantryIngredient;
