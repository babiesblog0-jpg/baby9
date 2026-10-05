const { Product, Purchase } = require('../models');
const { uploadToR2 } = require('../middleware/upload');
const { deleteFromR2, getKeyFromUrl } = require('../config/r2');

// Selling price after discount, rounded to 2 decimals.
const computePrice = (mrp, discountPercent) => {
  const base = Number(mrp) || 0;
  const off = Math.min(Math.max(Number(discountPercent) || 0, 0), 100);
  return Math.round(base * (1 - off / 100) * 100) / 100;
};

// The video link is rendered as an iframe source, so anything that isn't plain
// http(s) (javascript:, data:, …) is dropped here rather than stored and
// trusted later.
const sanitizeUrl = (value) => {
  const url = String(value ?? '').trim();
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : null;
};

// The pg driver returns DECIMAL columns as strings; send real numbers so the
// storefront can sort and format them without parsing.
const serialize = (product) => {
  const json = product.toJSON();
  json._id = json.id;
  json.mrp = Number(json.mrp);
  json.price = Number(json.price);
  // The PDF is paid content sitting behind a public image proxy, and these
  // read routes are unauthenticated — so the key never leaves the server.
  // Callers only learn whether a file is attached. Delivering it to a paying
  // customer needs its own authenticated endpoint.
  json.hasPdf = Boolean(json.pdfUrl);
  delete json.pdfUrl;
  // Legacy column (see the model); checkout goes through /api/shop/checkout.
  delete json.buyLink;
  if (json.image && json.image.includes('pub-bd5e8fdcf204f2176a5054c83d305f64.r2.dev')) {
    json.image = json.image.replace('https://pub-bd5e8fdcf204f2176a5054c83d305f64.r2.dev', '/api/images');
  }
  // Products saved before multi-image support only have `image`, so fall back
  // to it and always hand the storefront a single list to render.
  const gallery = Array.isArray(json.images) ? json.images.filter(Boolean) : [];
  json.images = gallery.length > 0 ? gallery : json.image ? [json.image] : [];
  return json;
};

// Create
exports.createProduct = async (req, res) => {
  try {
    const { name, description, mrp, discountPercent, badge, videoUrl, sortOrder, isActive } = req.body;

    if (!name || !description || mrp === undefined || mrp === '') {
      return res.status(400).json({ success: false, message: 'Please provide name, description and MRP' });
    }

    const imageFiles = req.files?.image || [];
    const pdfFile = req.files?.pdf?.[0];

    const gallery = [];
    for (const file of imageFiles) {
      gallery.push(await uploadToR2(file, 'products'));
    }
    const pdfUrl = pdfFile ? await uploadToR2(pdfFile, 'products/files') : null;

    const product = await Product.create({
      name,
      description,
      mrp: Number(mrp),
      discountPercent: discountPercent !== undefined ? Number(discountPercent) : 0,
      price: computePrice(mrp, discountPercent),
      image: gallery[0] || null,
      images: gallery,
      pdfUrl,
      videoUrl: sanitizeUrl(videoUrl),
      badge: badge || null,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
      isActive: isActive !== undefined ? isActive === true || isActive === 'true' : true,
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: serialize(product),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Read all
exports.getAllProducts = async (req, res) => {
  try {
    const { isActive } = req.query;
    const where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const products = await Product.findAll({
      where,
      order: [
        ['sortOrder', 'ASC'],
        ['createdAt', 'DESC'],
      ],
    });

    const data = products.map(serialize);

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Read one
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({ success: true, data: serialize(product) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const updateData = { ...req.body };
    if (updateData.mrp !== undefined) updateData.mrp = Number(updateData.mrp);
    if (updateData.discountPercent !== undefined) updateData.discountPercent = Number(updateData.discountPercent);
    if (updateData.sortOrder !== undefined) updateData.sortOrder = Number(updateData.sortOrder);
    if (updateData.isActive !== undefined) {
      updateData.isActive = updateData.isActive === true || updateData.isActive === 'true';
    }
    // Sent as empty strings when the admin clears the field, which should
    // store as null rather than an empty link.
    if (updateData.videoUrl !== undefined) updateData.videoUrl = sanitizeUrl(updateData.videoUrl);
    // Checkout links are created per buyer now; this column is no longer set.
    delete updateData.buyLink;

    // Either field changing means the stored selling price has to be recomputed.
    const nextMrp = updateData.mrp !== undefined ? updateData.mrp : product.mrp;
    const nextDiscount =
      updateData.discountPercent !== undefined ? updateData.discountPercent : product.discountPercent;
    updateData.price = computePrice(nextMrp, nextDiscount);

    // A field left empty in the admin form means "keep what's there", so only
    // replace a file when a new one was actually sent.
    const imageFiles = req.files?.image || [];
    const pdfFile = req.files?.pdf?.[0];

    // File locations are set from real uploads only — never from form fields,
    // which would let a caller point a product at any URL it liked.
    delete updateData.image;
    delete updateData.images;

    if (imageFiles.length > 0) {
      const gallery = [];
      for (const file of imageFiles) {
        gallery.push(await uploadToR2(file, 'products'));
      }
      updateData.images = gallery;
      updateData.image = gallery[0];

      // Uploading replaces the whole gallery, so retire what it replaced.
      const previous = Array.isArray(product.images) && product.images.length
        ? product.images
        : [product.image].filter(Boolean);
      for (const old of previous) {
        const oldKey = getKeyFromUrl(old);
        if (oldKey) await deleteFromR2(oldKey);
      }
    }

    if (pdfFile) {
      updateData.pdfUrl = await uploadToR2(pdfFile, 'products/files');
      if (product.pdfUrl) {
        const oldKey = getKeyFromUrl(product.pdfUrl);
        if (oldKey) await deleteFromR2(oldKey);
      }
    } else {
      // hasPdf is a read-only flag; never let it round-trip into the column.
      delete updateData.pdfUrl;
    }
    delete updateData.hasPdf;

    await product.update(updateData);

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: serialize(product),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Buyers were promised lifetime access, and their purchases reference this
    // row. So a sold product is only retired: gone from the shop and this panel
    // at once, but its record and PDF stay so every download link keeps working.
    const sold = await Purchase.count({ where: { productId: product.id } });
    if (sold > 0) {
      await product.destroy(); // soft delete (paranoid model)
      return res.status(200).json({
        success: true,
        message: `Product removed from the shop. Its ${sold} buyer${sold === 1 ? '' : 's'} can still download it.`,
      });
    }

    // Never sold: remove it completely. The row goes first, so a failure here
    // can't leave a product in the shop whose files have already been deleted.
    const gallery = Array.isArray(product.images) && product.images.length
      ? product.images
      : [product.image].filter(Boolean);
    const files = [...gallery, product.pdfUrl].filter(Boolean);

    await product.destroy({ force: true });

    for (const file of files) {
      const key = getKeyFromUrl(file);
      if (key) await deleteFromR2(key);
    }

    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Paid orders per product, for the admin panel. Admin-only: sales figures
// aren't part of the public catalogue.
exports.getProductOrderCounts = async (req, res) => {
  try {
    const rows = await Purchase.findAll({
      attributes: ['productId', [Purchase.sequelize.fn('COUNT', Purchase.sequelize.col('id')), 'count']],
      group: ['productId'],
      raw: true,
    });
    const data = Object.fromEntries(rows.map((row) => [row.productId, Number(row.count)]));
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
