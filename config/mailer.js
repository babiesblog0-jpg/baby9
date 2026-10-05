const nodemailer = require('nodemailer');

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

// Email is optional: without SMTP settings the shop still works, the buyer
// just gets their download on the thank-you page instead of by email.
const isConfigured = () => Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

let transporter = null;
const getTransporter = () => {
  if (!transporter) {
    const port = Number(SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465, // 465 is implicit TLS; 587 upgrades via STARTTLS
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Send the buyer their download link. Never throws: a mail failure must not
 * roll back a payment that already succeeded, so problems are logged and the
 * caller carries on.
 */
const sendPurchaseEmail = async ({ to, productName, downloadUrl }) => {
  if (!isConfigured()) {
    console.log('Purchase email skipped: SMTP is not configured');
    return false;
  }
  if (!to) {
    console.log('Purchase email skipped: Razorpay did not provide a customer email');
    return false;
  }

  const safeName = escapeHtml(productName);
  const safeUrl = escapeHtml(downloadUrl);

  try {
    await getTransporter().sendMail({
      from: SMTP_FROM || SMTP_USER,
      to,
      subject: `Your download: ${productName}`,
      text: `Thank you for your purchase!\n\n${productName}\nDownload your file here: ${downloadUrl}\n\nKeep this link private — it gives access to your file.\n\n— Baby Food Finder`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#374151">
          <h2 style="color:#F4A261;margin-bottom:8px">Thank you for your purchase!</h2>
          <p style="margin:0 0 20px">Your file is ready to download.</p>
          <div style="background:#FFF7ED;border:1px solid #FFE8D6;border-radius:14px;padding:20px;margin-bottom:20px">
            <p style="margin:0 0 14px;font-weight:bold;font-size:16px">${safeName}</p>
            <a href="${safeUrl}" style="display:inline-block;background:#F4A261;color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:bold">Download now</a>
          </div>
          <p style="font-size:12px;color:#9CA3AF;margin:0">Keep this link private — anyone with it can download your file.</p>
          <p style="font-size:12px;color:#9CA3AF;margin:16px 0 0">— Baby Food Finder</p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('Purchase email failed:', error.message);
    return false;
  }
};

module.exports = { isConfigured, sendPurchaseEmail };
