const crypto = require('crypto');
const { Op } = require('sequelize');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { Product, Purchase } = require('../models');
const { s3Client, R2_BUCKET } = require('../config/r2');
const {
  isWebhookConfigured,
  isCheckoutConfigured,
  verifyWebhookSignature,
  verifyPaymentLinkRedirect,
  fetchPaymentLink,
  fetchPayment,
  createPaymentLink,
} = require('../config/razorpay');
const { sendPurchaseEmail } = require('../config/mailer');

// pdfUrl is stored as the public proxy path (/api/images/<key>); the R2 object
// key is whatever follows that prefix.
const r2KeyFromStoredUrl = (url) => {
  if (!url) return null;
  const marker = '/api/images/';
  const index = url.indexOf(marker);
  return index === -1 ? String(url).replace(/^\//, '') : url.slice(index + marker.length);
};

const stripTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');

/**
 * Work out which product a payment was for. Links made by createCheckout carry
 * the product id in their notes, which settles it. Matching on a product's
 * buyLink only covers links an admin pasted in before checkout was automatic.
 */
const findProductForPayment = async ({ paymentLinkId, shortUrl, notes }) => {
  if (notes && notes.productId) {
    // paranoid: false — a buyer who was mid-payment when the product was
    // retired has still paid, and must still get their file.
    const byNote = await Product.findByPk(notes.productId, { paranoid: false }).catch(() => null);
    if (byNote) return byNote;
  }

  const candidates = await Product.findAll({ where: { buyLink: { [Op.ne]: null } }, paranoid: false });
  const target = stripTrailingSlash(shortUrl);

  return (
    candidates.find((product) => {
      const link = stripTrailingSlash(product.buyLink);
      if (target && link === target) return true;
      if (paymentLinkId && link.includes(paymentLinkId)) return true;
      return false;
    }) || null
  );
};

/**
 * Record a payment Razorpay has confirmed, or return the existing record.
 * Both the webhook and the buyer's return can confirm the same payment, often
 * within the same second, so this must be safe to call twice: the unique
 * payment id decides the winner and the loser just reads the row back.
 */
const recordPurchase = async ({ product, payment, paymentLinkId }) => {
  const existing = await Purchase.findOne({ where: { razorpayPaymentId: payment.id } });
  if (existing) return existing;

  let purchase;
  try {
    purchase = await Purchase.create({
      productId: product.id,
      email: payment.email || null,
      contact: payment.contact || null,
      razorpayPaymentId: payment.id,
      razorpayPaymentLinkId: paymentLinkId || null,
      // Razorpay reports money in the smallest unit (paise).
      amount: payment.amount != null ? Number(payment.amount) / 100 : null,
      currency: payment.currency || 'INR',
      downloadToken: crypto.randomBytes(32).toString('hex'),
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return Purchase.findOne({ where: { razorpayPaymentId: payment.id } });
    }
    throw error;
  }

  console.log(`Purchase recorded: ${product.name} → ${purchase.email || 'no email'} (${purchase.razorpayPaymentId})`);

  // Email is best-effort: the payment already succeeded, and the buyer can
  // still download from the thank-you page if delivery fails.
  if (purchase.email && product.pdfUrl) {
    const base = stripTrailingSlash(process.env.SHOP_PUBLIC_URL || '');
    const sent = await sendPurchaseEmail({
      to: purchase.email,
      productName: product.name,
      downloadUrl: `${base}/api/shop/download/${purchase.downloadToken}`,
    });
    if (sent) await purchase.update({ emailSentAt: new Date() });
  }

  return purchase;
};

/**
 * Confirm a returning buyer's payment directly with Razorpay, so the file is
 * available the moment they land on the thank-you page rather than only once
 * (and only if) the webhook arrives. Returns null if Razorpay doesn't report
 * the payment as captured.
 */
const confirmWithRazorpay = async ({ paymentId, paymentLinkId }) => {
  const [link, payment] = await Promise.all([fetchPaymentLink(paymentLinkId), fetchPayment(paymentId)]);

  // The redirect signature already ties this payment to this link; these
  // checks make sure the money was actually taken, not merely authorised.
  if (link.status !== 'paid' || payment.status !== 'captured') return null;

  const product = await findProductForPayment({
    paymentLinkId: link.id,
    shortUrl: link.short_url,
    notes: link.notes,
  });

  if (!product) {
    console.error(
      `Paid payment ${paymentId} could not be matched to a product ` +
        `(payment_link=${link.id}, short_url=${link.short_url || 'n/a'}). ` +
        "Check that the product's Buy Now link is this exact payment link."
    );
    return null;
  }

  return recordPurchase({ product, payment, paymentLinkId: link.id });
};

// Free means the admin set the selling price to exactly ₹0 (MRP 0, or a 100%
// discount). Anything between ₹0 and ₹1 is still "not available", as before.
const isFreeProduct = (product) => Number(product.price) === 0;

/**
 * Fetch a product's PDF from R2 and set the download headers. The caller
 * decides whether the request may have it, then pipes the returned body.
 */
const prepareProductPdf = async (res, product) => {
  const key = r2KeyFromStoredUrl(product.pdfUrl);
  const object = await s3Client.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));

  const safeName = product.name.replace(/[^a-z0-9\-_ ]/gi, '').trim() || 'download';

  res.set('Content-Type', object.ContentType || 'application/pdf');
  if (object.ContentLength) res.set('Content-Length', object.ContentLength);
  res.set('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
  // Purchased content must never be cached by a shared proxy.
  res.set('Cache-Control', 'private, no-store');

  return object;
};

/**
 * Start a purchase: create a Razorpay payment link for this one buyer and send
 * back its URL. Everything on the link comes from the database — price, name,
 * product — so the buyer can't change what they pay, and every product can be
 * sold to any number of buyers with no Razorpay setup per product.
 */
exports.createCheckout = async (req, res) => {
  try {
    // findByPk throws on a malformed id; that's just "not found" here.
    const product = await Product.findByPk(req.params.productId).catch(() => null);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Selling something with no file would take the money and deliver nothing.
    if (!product.pdfUrl) {
      return res.status(409).json({ success: false, message: 'This product is not available for purchase yet.' });
    }

    // A free product skips payment entirely: the buyer is sent straight to
    // the file. Checked before the Razorpay settings so free downloads keep
    // working even while payments are unavailable.
    if (isFreeProduct(product)) {
      return res.status(200).json({
        success: true,
        downloadUrl: `/api/shop/free-download/${encodeURIComponent(product.id)}`,
      });
    }

    if (!isCheckoutConfigured()) {
      console.error('Checkout unavailable: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set');
      return res.status(503).json({ success: false, message: 'Payments are temporarily unavailable.' });
    }

    const base = stripTrailingSlash(process.env.SHOP_PUBLIC_URL || '');
    if (!base) {
      console.error('Checkout unavailable: SHOP_PUBLIC_URL is not set, so buyers have no page to return to');
      return res.status(503).json({ success: false, message: 'Payments are temporarily unavailable.' });
    }

    // Razorpay works in paise and won't take less than ₹1.
    const amount = Math.round(Number(product.price) * 100);
    if (!Number.isFinite(amount) || amount < 100) {
      return res.status(409).json({ success: false, message: 'This product is not available for purchase yet.' });
    }

    const link = await createPaymentLink({
      amount,
      currency: 'INR',
      accept_partial: false,
      description: product.name.slice(0, 2048),
      // Must be unique per link across the Razorpay account.
      reference_id: `bff_${crypto.randomBytes(12).toString('hex')}`,
      // An unpaid link is useless after this; it keeps the dashboard tidy.
      expire_by: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      // Razorpay's page collects the buyer's email and phone itself.
      notify: { sms: false, email: false },
      reminder_enable: false,
      notes: { productId: product.id, productName: product.name.slice(0, 200) },
      callback_url: `${base}/shop/thank-you`,
      callback_method: 'get',
    });

    return res.status(200).json({ success: true, checkoutUrl: link.short_url });
  } catch (error) {
    console.error(`Checkout failed for product ${req.params.productId}: ${error.message}`);
    return res.status(502).json({ success: false, message: 'Could not start checkout. Please try again.' });
  }
};

/**
 * Razorpay webhook. One of the two ways a payment gets confirmed (the other is
 * the buyer's signed return, see getPurchaseStatus). It still matters when the
 * buyer closes the tab before coming back: this is what records the purchase
 * and emails them the link.
 *
 * Always answers 200 once the signature checks out, including for events we
 * don't act on: a non-2xx makes Razorpay retry the delivery for hours.
 */
exports.handleRazorpayWebhook = async (req, res) => {
  try {
    if (!isWebhookConfigured()) {
      console.error('Razorpay webhook received but RAZORPAY_WEBHOOK_SECRET is not set — ignoring');
      return res.status(503).json({ success: false, message: 'Webhook not configured' });
    }

    // req.body is a raw Buffer here (see the express.raw mount in server.js).
    // Signatures are over the exact bytes Razorpay sent.
    const signature = req.get('X-Razorpay-Signature');
    if (!verifyWebhookSignature(req.body, signature)) {
      console.error('Razorpay webhook rejected: invalid signature');
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const event = JSON.parse(req.body.toString('utf8'));
    const paymentEntity = event?.payload?.payment?.entity || null;
    const linkEntity = event?.payload?.payment_link?.entity || null;

    const isPaid =
      event?.event === 'payment_link.paid' ||
      (event?.event === 'payment.captured' && paymentEntity?.status === 'captured');

    if (!isPaid || !paymentEntity) {
      // Acknowledged but not actionable.
      return res.status(200).json({ success: true, message: 'Event ignored' });
    }

    // Razorpay retries deliveries; the payment id is unique so a repeat is a
    // no-op rather than a second grant.
    const existing = await Purchase.findOne({ where: { razorpayPaymentId: paymentEntity.id } });
    if (existing) {
      return res.status(200).json({ success: true, message: 'Already recorded' });
    }

    const product = await findProductForPayment({
      paymentLinkId: linkEntity?.id,
      shortUrl: linkEntity?.short_url,
      notes: linkEntity?.notes || paymentEntity?.notes,
    });

    if (!product) {
      console.error(
        `Razorpay webhook: paid payment ${paymentEntity.id} could not be matched to a product ` +
          `(payment_link=${linkEntity?.id || 'n/a'}, short_url=${linkEntity?.short_url || 'n/a'}). ` +
          'Check that the product\'s Buy Now link is this exact payment link.'
      );
      return res.status(200).json({ success: true, message: 'No matching product' });
    }

    await recordPurchase({ product, payment: paymentEntity, paymentLinkId: linkEntity?.id });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Razorpay webhook error:', error.message);
    // The signature was already verified at this point, so this is our bug,
    // not a bad request — let Razorpay retry.
    return res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};

// How long a buyer's download link works: the thank-you page counts down the
// same 60 seconds. The grace only exists server-side, so a click at second 59
// isn't refused just because the request took a moment to arrive.
const DOWNLOAD_WINDOW_SECONDS = 60;
const DOWNLOAD_GRACE_SECONDS = 10;

/**
 * Start the purchase's download window if it hasn't started yet, and return
 * when it ends. It starts the first time the link is handed out or used, and
 * is only ever set once — the conditional update means two requests arriving
 * together can't each start their own window.
 */
const openDownloadWindow = async (purchase) => {
  if (!purchase.downloadExpiresAt) {
    await Purchase.update(
      { downloadExpiresAt: new Date(Date.now() + DOWNLOAD_WINDOW_SECONDS * 1000) },
      { where: { id: purchase.id, downloadExpiresAt: null } }
    );
    const fresh = await Purchase.findByPk(purchase.id, { attributes: ['downloadExpiresAt'] });
    purchase.downloadExpiresAt = fresh.downloadExpiresAt;
  }
  return new Date(purchase.downloadExpiresAt);
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Opening an expired link in a browser should explain itself, not dump JSON.
const expiredDownloadPage = () => {
  const shop = `${stripTrailingSlash(process.env.SHOP_PUBLIC_URL || '')}/shop`;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex, nofollow" /><title>Download link expired — Baby Food Finder</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;
    font-family:Nunito,Arial,sans-serif;color:#4b5563;background:linear-gradient(to bottom right,#fff7ed,#fff1f2,#ecfdf5)}
  .card{max-width:480px;width:100%;background:#fff;border-radius:28px;padding:40px 32px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.08)}
  .emoji{font-size:48px;margin:0 0 12px} h1{font-family:Poppins,Arial,sans-serif;font-size:24px;color:#1f2937;margin:0 0 10px}
  p{margin:0 0 8px;line-height:1.6;font-size:15px}
  a{display:inline-block;margin-top:20px;padding:13px 30px;border-radius:999px;background:#F4A261;color:#fff;text-decoration:none;font-weight:700}
</style></head><body><div class="card">
  <p class="emoji">⌛</p>
  <h1>This download link has expired</h1>
  <p>For your security, each download link works for ${DOWNLOAD_WINDOW_SECONDS} seconds after purchase.</p>
  <p>If you didn't get your file, please contact us with your payment details and we'll help right away.</p>
  <a href="${escapeHtml(shop)}">Back to Little Library</a>
</div></body></html>`;
};

/**
 * Called by the thank-you page after Razorpay redirects the buyer back.
 * The redirect signature proves this browser completed the payment, and the
 * payment must also be confirmed as captured — by the webhook, or by asking
 * Razorpay directly — before a download token is handed out.
 */
exports.getPurchaseStatus = async (req, res) => {
  try {
    const {
      razorpay_payment_id: paymentId,
      razorpay_payment_link_id: paymentLinkId,
      razorpay_payment_link_reference_id: referenceId = '',
      razorpay_payment_link_status: status,
      razorpay_signature: signature,
    } = req.query;

    if (!paymentId || !signature || !paymentLinkId) {
      return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    const validRedirect = verifyPaymentLinkRedirect({
      paymentLinkId,
      referenceId,
      status,
      paymentId,
      signature,
    });

    if (!validRedirect) {
      return res.status(403).json({ success: false, message: 'Payment could not be verified' });
    }

    const loadPurchase = () =>
      Purchase.findOne({
        where: { razorpayPaymentId: paymentId },
        include: [{ model: Product, as: 'product', attributes: ['name', 'pdfUrl'], paranoid: false }],
      });

    let purchase = await loadPurchase();

    // No webhook yet: confirm with Razorpay ourselves rather than making the
    // buyer wait on it. If that lookup fails, fall back to waiting — the page
    // keeps polling and the webhook can still land.
    if (!purchase && status === 'paid') {
      try {
        if (await confirmWithRazorpay({ paymentId, paymentLinkId })) {
          purchase = await loadPurchase();
        }
      } catch (error) {
        console.error(`Could not confirm payment ${paymentId} with Razorpay: ${error.message}`);
      }
    }

    if (!purchase) {
      return res.status(200).json({ success: true, ready: false });
    }

    const productName = purchase.product?.name || '';
    const hasFile = Boolean(purchase.product?.pdfUrl);

    // Nothing to download, so there's no window to start.
    if (!hasFile) {
      return res.status(200).json({ success: true, ready: true, productName, hasFile: false });
    }

    // Showing the link here is what starts the buyer's 60 seconds. On a
    // refresh the page gets the time that's actually left, not a fresh 60.
    const msLeft = (await openDownloadWindow(purchase)).getTime() - Date.now();
    if (msLeft <= 0) {
      return res.status(200).json({ success: true, ready: true, productName, hasFile: true, expired: true });
    }

    return res.status(200).json({
      success: true,
      ready: true,
      productName,
      hasFile: true,
      secondsLeft: Math.ceil(msLeft / 1000),
      downloadUrl: `/api/shop/download/${purchase.downloadToken}`,
      // Only claim an email was sent if one actually was — emailSentAt is set
      // after a successful delivery, not merely because we have an address.
      emailedTo: purchase.emailSentAt ? purchase.email : null,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Stream a purchased file. The token is the authorisation: it exists only on a
 * purchase row, which is only written once Razorpay has confirmed the payment,
 * and it only works during that purchase's download window.
 */
exports.downloadPurchase = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token || token.length < 32) {
      return res.status(404).json({ success: false, message: 'Invalid download link' });
    }

    const purchase = await Purchase.findOne({
      where: { downloadToken: token },
      include: [{ model: Product, as: 'product', attributes: ['name', 'pdfUrl'], paranoid: false }],
    });

    if (!purchase || !purchase.product?.pdfUrl) {
      return res.status(404).json({ success: false, message: 'Download not found' });
    }

    // A link opened directly (without the thank-you page) starts its window
    // now; once the window plus grace has passed, the link is dead.
    const expiresAt = await openDownloadWindow(purchase);
    if (Date.now() > expiresAt.getTime() + DOWNLOAD_GRACE_SECONDS * 1000) {
      res.set('Cache-Control', 'no-store');
      if (req.accepts(['html', 'json']) === 'html') {
        return res.status(410).type('html').send(expiredDownloadPage());
      }
      return res.status(410).json({ success: false, message: 'This download link has expired' });
    }

    const object = await prepareProductPdf(res, purchase.product);

    await purchase.increment('downloadCount');

    object.Body.pipe(res);
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    console.error('Download error:', error.message);
    return res.status(500).json({ success: false, message: 'Could not deliver the file' });
  }
};

/**
 * Stream a free product's file. Only a product that is live, has a file, and
 * is priced at exactly ₹0 can be fetched this way; everything else still has
 * to go through payment.
 */
exports.downloadFreeProduct = async (req, res) => {
  try {
    // findByPk throws on a malformed id; that's just "not found" here.
    const product = await Product.findByPk(req.params.productId).catch(() => null);
    if (!product || !product.isActive || !product.pdfUrl || !isFreeProduct(product)) {
      return res.status(404).json({ success: false, message: 'Download not found' });
    }

    const object = await prepareProductPdf(res, product);
    object.Body.pipe(res);
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    console.error('Free download error:', error.message);
    return res.status(500).json({ success: false, message: 'Could not deliver the file' });
  }
};
