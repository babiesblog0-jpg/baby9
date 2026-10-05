const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Small pieces of site copy the admin can edit without a deploy, stored one
// row per key (e.g. the scrolling disclaimer on /shop).
const SiteSetting = sequelize.define(
  'SiteSetting',
  {
    key: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = SiteSetting;
