const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FingerFood = sequelize.define(
  'FingerFood',
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
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
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
    // Age (in months) from which this finger food is safe: 10, 11, or 12
    minAgeMonths: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
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

module.exports = FingerFood;
