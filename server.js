require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { connectDB } = require('./config/database');
const cors = require('cors');

// Import models (sets up associations)
require('./models');

// Import routes
const authRoutes = require('./routes/authRoutes');
const babyFoodRoutes = require('./routes/babyFoodRoutes');
const blogRoutes = require('./routes/blogRoutes');
const parentingTipRoutes = require('./routes/parentingTipRoutes');
const parentingGalleryRoutes = require('./routes/parentingGalleryRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const pantryIngredientRoutes = require('./routes/pantryIngredientRoutes');
const featuredDelightRoutes = require('./routes/featuredDelightRoutes');
const fingerFoodRoutes = require('./routes/fingerFoodRoutes');
const aiMixerRoutes = require('./routes/aiMixerRoutes');
const productRoutes = require('./routes/productRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const siteSettingRoutes = require('./routes/siteSettingRoutes');
const { handleRazorpayWebhook } = require('./controllers/paymentController');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, R2_BUCKET } = require('./config/r2');

const app = express();

// Razorpay signs the exact bytes it delivers, so this route has to see the
// untouched body — it is mounted ahead of express.json() for that reason.
// Re-serialising parsed JSON changes the bytes and every signature would fail.
app.post(
  '/api/payments/razorpay/webhook',
  express.raw({ type: '*/*', limit: '1mb' }),
  handleRazorpayWebhook
);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());

// Serve static files for admin panel — no caching, so admins always get the
// latest panel HTML/JS immediately after a deploy.
app.use(
  '/admin',
  express.static(path.join(__dirname, 'admin'), {
    etag: false,
    lastModified: false,
    setHeaders: (res) => {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    },
  })
);

const frontendPath = path.join(__dirname, '../frontend');
const frontendAvailable = fs.existsSync(path.join(frontendPath, 'index.html'));
const babyMilestoneTrackerDistPath = path.join(frontendPath, 'tools', 'baby-milestone-tracker', 'dist');

// Serve baby milestone tracker built assets BEFORE the generic static middleware
// so the source folder doesn't shadow the built dist files.
app.use('/tools/baby-milestone-tracker/assets', express.static(path.join(babyMilestoneTrackerDistPath, 'assets')));

app.get(['/tools/baby-milestone-tracker', '/tools/baby-milestone-tracker/'], (req, res) => {
  if (!frontendAvailable) {
    return res.status(404).json({ success: false, message: 'Frontend is hosted separately.' });
  }
  const toolEntry = path.join(babyMilestoneTrackerDistPath, 'index.html');
  if (fs.existsSync(toolEntry)) {
    return res.sendFile(toolEntry);
  }
  return res.status(404).json({ success: false, message: 'Baby Milestone Tracker not built. Run: npm run build' });
});

// Serve frontend static files (present in local/full-repo deploys; absent
// when the backend is deployed standalone, e.g. on Render with the frontend
// hosted separately)
if (frontendAvailable) {
  app.use(express.static(frontendPath));
}

// Connect to database
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/baby-foods', babyFoodRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/parenting-tips', parentingTipRoutes);
app.use('/api/parenting-gallery', parentingGalleryRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/pantry-ingredients', pantryIngredientRoutes);
app.use('/api/featured-delights', featuredDelightRoutes);
app.use('/api/finger-foods', fingerFoodRoutes);
app.use('/api/ai-mixer', aiMixerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/shop', paymentRoutes);
app.use('/api/site-settings', siteSettingRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Server is running', db: 'PostgreSQL (Neon)', storage: 'Cloudflare R2' });
});

// Image proxy
app.get('/api/images/*', async (req, res, next) => {
  try {
    const key = req.params[0];
    if (!key) return res.status(400).send('Key is required');

    // Purchased files live under products/files/. They are paid content and
    // are only ever served by the token-checked /api/shop/download route, so
    // this public proxy must not hand them out.
    if (key.startsWith('products/files/')) {
      return res.status(404).send('Not found');
    }
    
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    });
    
    const response = await s3Client.send(command);
    res.set('Content-Type', response.ContentType);
    res.set('Content-Length', response.ContentLength);
    res.set('Cache-Control', 'public, max-age=31536000');
    
    response.Body.pipe(res);
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return res.status(404).send('Image not found');
    }
    console.error('Image proxy error:', error);
    next(error);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// Standalone AI Recipe Mixer page — a self-contained static page (not part
// of the compiled React bundle), must be registered before the SPA fallback.
app.get(['/reciepe-mixer', '/reciepe-mixer/'], (req, res) => {
  if (!frontendAvailable) {
    return res.status(404).json({ success: false, message: 'Frontend is hosted separately.' });
  }
  res.sendFile(path.join(frontendPath, 'reciepe-mixer', 'index.html'));
});

// Standalone Shop page — same arrangement as the mixer above: a self-contained
// static page served before the SPA fallback claims the route.
app.get(['/shop', '/shop/'], (req, res) => {
  if (!frontendAvailable) {
    return res.status(404).json({ success: false, message: 'Frontend is hosted separately.' });
  }
  res.sendFile(path.join(frontendPath, 'shop', 'index.html'));
});

// Where Razorpay returns the buyer after a payment link is paid.
app.get(['/shop/thank-you', '/shop/thank-you/'], (req, res) => {
  if (!frontendAvailable) {
    return res.status(404).json({ success: false, message: 'Frontend is hosted separately.' });
  }
  res.sendFile(path.join(frontendPath, 'shop', 'thank-you.html'));
});

// SPA fallback - serve index.html for all non-API routes
app.use((req, res) => {
  // Return proper JSON 404 for API routes so frontend doesn't get HTML
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: `API endpoint not found: ${req.method} ${req.path}`,
    });
  }
  // API-only deploy (frontend hosted separately): respond cleanly instead of
  // erroring on a missing file.
  if (!frontendAvailable) {
    return res.status(200).json({ success: true, message: 'Baby Food API is running. Frontend is hosted separately.' });
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
