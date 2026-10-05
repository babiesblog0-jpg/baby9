const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * A payment Razorpay has confirmed. Rows are only written after a
 * signature-verified webhook, or a signed buyer return that Razorpay's API
 * reports as captured — so the presence of a row is what grants access to the
 * product file, and nothing else does.
 */
const Purchase = sequelize.define(
  'Purchase',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Products', key: 'id' },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    contact: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    // Unique so a webhook Razorpay retries can't create duplicate purchases.
    razorpayPaymentId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    razorpayPaymentLinkId: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'INR',
    },
    // Bearer credential for the download endpoint: 256 bits of randomness,
    // handed only to the verified buyer.
    downloadToken: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    downloadCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // End of the download window. Null until the link is first shown on the
    // thank-you page or first opened; set once, never extended. After it
    // passes the download token stops working.
    downloadExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    emailSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = Purchase;
