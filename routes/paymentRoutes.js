const express = require('express');
const {
  createCheckout,
  getPurchaseStatus,
  downloadPurchase,
  downloadFreeProduct,
} = require('../controllers/paymentController');

const router = express.Router();

// All public by design. Checkout only opens a payment page at the product's
// stored price; the redirect signature and the download token are what
// authorise the other two, and a free download only serves products priced
// at ₹0. The webhook route is mounted separately in
// server.js because it needs the raw request body.
router.post('/checkout/:productId', createCheckout);
router.get('/purchase-status', getPurchaseStatus);
router.get('/download/:token', downloadPurchase);
router.get('/free-download/:productId', downloadFreeProduct);

module.exports = router;
