const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ParentingTip = sequelize.define(
  'ParentingTip',
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
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    excerpt: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    authorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    featuredImage: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    category: {
      type: DataTypes.ENUM('safety', 'health', 'development', 'bonding', 'feeding', 'sleep', 'other'),
      defaultValue: 'other',
    },
    tags: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    publishedDate: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    views: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = ParentingTip;
