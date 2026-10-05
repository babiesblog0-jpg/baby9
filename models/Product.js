const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define(
  'Product',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    mrp: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    discountPercent: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // Selling price, derived from mrp + discountPercent whenever either is
    // saved, so the shop can sort by price directly instead of in JS.
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    // Kept as the first gallery image so rows created before multi-image
    // support still render, and so anything reading `image` keeps working.
    image: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    // Full gallery, in display order.
    images: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    // Optional product video, supplied as a link (YouTube, Vimeo or a direct
    // file). Videos are never uploaded to R2 — only the URL is stored.
    videoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    // Legacy: an admin-pasted Razorpay link from before checkout links were
    // created per buyer. No longer set. It stays in the model because sync
    // ({ alter: true }) would drop the column, and it still lets a payment on
    // one of those old links be matched to its product.
    buyLink: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    // The downloadable file itself, held in R2. Admin-only for now: nothing on
    // the storefront links to it, so it isn't exposed to customers.
    pdfUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    badge: {
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
    // Deleting a product that has been sold only sets deletedAt: it drops out
    // of every normal query (shop, admin list, checkout) while its row and PDF
    // stay available to existing buyers' download links.
    paranoid: true,
  }
);

module.exports = Product;
