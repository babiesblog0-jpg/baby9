const { ParentingTip, User } = require('../models');
const { uploadToR2 } = require('../middleware/upload');
const { deleteFromR2, getKeyFromUrl } = require('../config/r2');

// Create
exports.createParentingTip = async (req, res) => {
  try {
    const { title, content, excerpt, category, tags, isPublished } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Please provide title and content' });
    }

    // Upload image to R2 if provided
    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToR2(req.file, 'parenting-tips');
    }

    const isPublishedBool = isPublished === 'true' || isPublished === true;

    const tip = await ParentingTip.create({
      title,
      content,
      excerpt: excerpt || content.replace(/<[^>]+>/g, '').substring(0, 150),
      authorId: req.user.id,
      category: category || 'other',
      tags: tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags) : [],
      isPublished: isPublishedBool,
      publishedDate: isPublishedBool ? new Date() : null,
      featuredImage: imageUrl,
    });

    res.status(201).json({
      success: true,
      message: 'Parenting tip created successfully',
      data: tip,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Read all
exports.getAllParentingTips = async (req, res) => {
  try {
    const { category, isPublished } = req.query;
    const where = {};

    if (category) where.category = category;
    if (isPublished !== undefined) where.isPublished = isPublished === 'true';

    const tips = await ParentingTip.findAll({
      where,
      include: [{ model: User, as: 'tipAuthor', attributes: ['name', 'email'] }],
      order: [['createdAt', 'DESC']],
    });

    // Map to match the frontend expected shape
    const data = tips.map((tip) => {
      const json = tip.toJSON();
      json._id = json.id;
      if (json.featuredImage && json.featuredImage.includes('pub-bd5e8fdcf204f2176a5054c83d305f64.r2.dev')) {
        json.featuredImage = json.featuredImage.replace('https://pub-bd5e8fdcf204f2176a5054c83d305f64.r2.dev', '/api/images');
      }
      return json;
    });

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Read one
exports.getParentingTip = async (req, res) => {
  try {
    const tip = await ParentingTip.findByPk(req.params.id, {
      include: [{ model: User, as: 'tipAuthor', attributes: ['name', 'email'] }],
    });

    if (!tip) {
      return res.status(404).json({ success: false, message: 'Parenting tip not found' });
    }

    // Increment view count
    await tip.increment('views');

    const data = tip.toJSON();
    data._id = data.id;
    if (data.featuredImage && data.featuredImage.includes('pub-bd5e8fdcf204f2176a5054c83d305f64.r2.dev')) {
      data.featuredImage = data.featuredImage.replace('https://pub-bd5e8fdcf204f2176a5054c83d305f64.r2.dev', '/api/images');
    }
    data.views += 1; // Reflect the incremented value

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update
exports.updateParentingTip = async (req, res) => {
  try {
    let tip = await ParentingTip.findByPk(req.params.id);

    if (!tip) {
      return res.status(404).json({ success: false, message: 'Parenting tip not found' });
    }

    // Check authorization
    if (tip.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this resource' });
    }

    const updateData = { ...req.body };
    if (updateData.tags) {
      updateData.tags = typeof updateData.tags === 'string' ? updateData.tags.split(',').map(t => t.trim()) : updateData.tags;
    }
    if (req.body.isPublished && !tip.isPublished) {
      updateData.publishedDate = new Date();
    }

    if (req.file) {
      const newImageUrl = await uploadToR2(req.file, 'parenting-tips');
      updateData.featuredImage = newImageUrl;
      // Delete old image from R2
      if (tip.featuredImage) {
        const oldKey = getKeyFromUrl(tip.featuredImage);
        if (oldKey) await deleteFromR2(oldKey);
      }
    }

    await tip.update(updateData);

    const data = tip.toJSON();
    data._id = data.id;

    res.status(200).json({
      success: true,
      message: 'Parenting tip updated successfully',
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete
exports.deleteParentingTip = async (req, res) => {
  try {
    const tip = await ParentingTip.findByPk(req.params.id);

    if (!tip) {
      return res.status(404).json({ success: false, message: 'Parenting tip not found' });
    }

    // Check authorization
    if (tip.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this resource' });
    }

    // Delete image from R2
    if (tip.featuredImage) {
      const key = getKeyFromUrl(tip.featuredImage);
      if (key) await deleteFromR2(key);
    }

    await tip.destroy();

    res.status(200).json({
      success: true,
      message: 'Parenting tip deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
