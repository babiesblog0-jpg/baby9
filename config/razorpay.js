const crypto = require('crypto');

const KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

// Webhooks are the only proof of payment this app accepts, so without a
// webhook secret there is nothing to verify against and the endpoint refuses
// to process anything rather than trusting the request.
const isWebhookConfigured = () => Boolean(WEBHOOK_SECRET);
const isCheckoutConfigured = () => Boolean(KEY_ID && KEY_SECRET);

// Constant-time compare so a wrong signature can't be narrowed down by timing.
// Both sides are hex digests of the same length; a length mismatch means the
// input was malformed and is rejected outright.
const safeEquals = (a, b) => {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

/**
 * Verify a webhook delivery.
 * Razorpay signs the exact raw request body with the webhook secret, so the
 * body must be the untouched Buffer — re-serialising parsed JSON changes the
 * bytes and the signature will never match.
 */
const verifyWebhookSignature = (rawBody, signature) => {
  if (!isWebhookConfigured() || !signature) return false;
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
  return safeEquals(expected, signature);
};

/**
 * Verify the redirect Razorpay sends the customer back with after a Payment
 * Link is paid. Signed with the key secret over
 *   payment_link_id | payment_link_reference_id | payment_link_status | payment_id
 * This proves the browser really came from a completed payment, so the
 * thank-you page can be shown to the buyer and nobody else.
 */
const verifyPaymentLinkRedirect = ({
  paymentLinkId,
  referenceId,
  status,
  paymentId,
  signature,
}) => {
  if (!isCheckoutConfigured() || !signature) return false;
  const payload = `${paymentLinkId}|${referenceId}|${status}|${paymentId}`;
  const expected = crypto.createHmac('sha256', KEY_SECRET).update(payload).digest('hex');
  return safeEquals(expected, signature);
};

const API_BASE = 'https://api.razorpay.com/v1';

/**
 * Server-to-server call to Razorpay's API, authenticated with the key id and
 * secret. Used to create each buyer's payment link and to confirm payments
 * directly instead of relying only on the webhook arriving.
 */
const razorpayRequest = async (method, path, body) => {
  const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 401) {
    throw new Error('Razorpay rejected the API credentials — check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
  }
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    const reason = detail?.error?.description ? `: ${detail.error.description}` : '';
    throw new Error(`Razorpay API ${method} ${path} responded ${response.status}${reason}`);
  }
  return response.json();
};

const fetchPaymentLink = (id) => razorpayRequest('GET', `/payment_links/${encodeURIComponent(id)}`);
const fetchPayment = (id) => razorpayRequest('GET', `/payments/${encodeURIComponent(id)}`);
const createPaymentLink = (payload) => razorpayRequest('POST', '/payment_links', payload);

module.exports = {
  KEY_ID,
  isWebhookConfigured,
  isCheckoutConfigured,
  verifyWebhookSignature,
  verifyPaymentLinkRedirect,
  fetchPaymentLink,
  fetchPayment,
  createPaymentLink,
};
