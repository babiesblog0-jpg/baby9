const { FeaturedDelight } = require('../models');
const { uploadToR2 } = require('../middleware/upload');
const { deleteFromR2, getKeyFromUrl } = require('../config/r2');

// Create
exports.createFeaturedDelight = async (req, res) => {
  try {
    const { title, description, ageLabel, icon, sortOrder, isActive } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Please provide title and description' });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToR2(req.file, 'featured-delights');
    }

    if (!imageUrl && !icon) {
      return res.status(400).json({ success: false, message: 'Please provide either an image or an emoji icon' });
    }

    const delight = await FeaturedDelight.create({
      title,
      description,
      ageLabel: ageLabel || null,
      icon: imageUrl ? null : icon || null,
      image: imageUrl,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
      isActive: isActive !== undefined ? isActive === true || isActive === 'true' : true,
    });

    res.status(201).json({
      success: true,
      message: 'Featured delight created successfully',
      data: { ...delight.toJSON(), _id: delight.id },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Read all
exports.getAllFeaturedDelights = async (req, res) => {
  try {
    const { isActive } = req.query;
    const where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const delights = await FeaturedDelight.findAll({
      where,
      order: [
        ['sortOrder', 'ASC'],
        ['createdAt', 'DESC'],
      ],
    });

    const data = delights.map((item) => {
      const json = item.toJSON();
      json._id = json.id;
      if (json.image && json.image.includes('pub-bd5e8fdcf204f2176a5054c83d305f64.r2.dev')) {
        json.image = json.image.replace('https://pub-bd5e8fdcf204f2176a5054c83d305f64.r2.dev', '/api/images');
      }
      return json;
    });

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Read one
exports.getFeaturedDelight = async (req, res) => {
  try {
    const delight = await FeaturedDelight.findByPk(req.params.id);

    if (!delight) {
      return res.status(404).json({ success: false, message: 'Featured delight not found' });
    }

    const data = delight.toJSON();
    data._id = data.id;

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update
exports.updateFeaturedDelight = async (req, res) => {
  try {
    const delight = await FeaturedDelight.findByPk(req.params.id);

    if (!delight) {
      return res.status(404).json({ success: false, message: 'Featured delight not found' });
    }

    const updateData = { ...req.body };
    if (updateData.sortOrder !== undefined) updateData.sortOrder = Number(updateData.sortOrder);
    if (updateData.isActive !== undefined) updateData.isActive = updateData.isActive === true || updateData.isActive === 'true';

    if (req.file) {
      const newImageUrl = await uploadToR2(req.file, 'featured-delights');
      updateData.image = newImageUrl;
      updateData.icon = null; // an uploaded image takes precedence over any emoji icon
      if (delight.image) {
        const oldKey = getKeyFromUrl(delight.image);
        if (oldKey) await deleteFromR2(oldKey);
      }
    } else if (updateData.icon) {
      // Switching back to an emoji icon — drop any previously uploaded image
      updateData.image = null;
      if (delight.image) {
        const oldKey = getKeyFromUrl(delight.image);
        if (oldKey) await deleteFromR2(oldKey);
      }
    }

    await delight.update(updateData);

    const data = delight.toJSON();
    data._id = data.id;

    res.status(200).json({
      success: true,
      message: 'Featured delight updated successfully',
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete
exports.deleteFeaturedDelight = async (req, res) => {
  try {
    const delight = await FeaturedDelight.findByPk(req.params.id);

    if (!delight) {
      return res.status(404).json({ success: false, message: 'Featured delight not found' });
    }

    if (delight.image) {
      const key = getKeyFromUrl(delight.image);
      if (key) await deleteFromR2(key);
    }

    await delight.destroy();

    res.status(200).json({ success: true, message: 'Featured delight deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
