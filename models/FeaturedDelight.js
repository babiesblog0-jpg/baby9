const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FeaturedDelight = sequelize.define(
  'FeaturedDelight',
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
    ageLabel: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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

module.exports = FeaturedDelight;
