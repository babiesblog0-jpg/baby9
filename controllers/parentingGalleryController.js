const { ParentingGallery } = require('../models');
const { uploadToR2 } = require('../middleware/upload');
const { deleteFromR2, getKeyFromUrl } = require('../config/r2');

// Create
exports.createGalleryItem = async (req, res) => {
  try {
    const { name, sortOrder } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Please provide a name' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image' });
    }

    const imageUrl = await uploadToR2(req.file, 'parenting-gallery');

    const item = await ParentingGallery.create({
      name,
      image: imageUrl,
      sortOrder: sortOrder ? parseInt(sortOrder, 10) : 0,
    });

    res.status(201).json({
      success: true,
      message: 'Gallery item created successfully',
      data: item,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Read all
exports.getAllGalleryItems = async (req, res) => {
  try {
    const { activeOnly } = req.query;
    const where = {};

    if (activeOnly === 'true') where.isActive = true;

    const items = await ParentingGallery.findAll({
      where,
      order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']],
    });

    const data = items.map((item) => {
      const json = item.toJSON();
      json._id = json.id;
      if (json.image && json.image.includes('pub-bd5e8fdcf204f2176a5054c83d305f64.r2.dev')) {
        json.image = json.image.replace('https://pub-bd5e8fdcf204f2176a5054c83d305f64.r2.dev', '/api/images');
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
exports.getGalleryItem = async (req, res) => {
  try {
    const item = await ParentingGallery.findByPk(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Gallery item not found' });
    }

    const data = item.toJSON();
    data._id = data.id;
    if (data.image && data.image.includes('pub-bd5e8fdcf204f2176a5054c83d305f64.r2.dev')) {
      data.image = data.image.replace('https://pub-bd5e8fdcf204f2176a5054c83d305f64.r2.dev', '/api/images');
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update
exports.updateGalleryItem = async (req, res) => {
  try {
    const item = await ParentingGallery.findByPk(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Gallery item not found' });
    }

    const updateData = { ...req.body };
    if (updateData.sortOrder) {
      updateData.sortOrder = parseInt(updateData.sortOrder, 10);
    }
    if (updateData.isActive !== undefined) {
      updateData.isActive = updateData.isActive === 'true' || updateData.isActive === true;
    }

    if (req.file) {
      const newImageUrl = await uploadToR2(req.file, 'parenting-gallery');
      // Delete old image from R2
      if (item.image) {
        const oldKey = getKeyFromUrl(item.image);
        if (oldKey) await deleteFromR2(oldKey);
      }
      updateData.image = newImageUrl;
    }

    await item.update(updateData);

    const data = item.toJSON();
    data._id = data.id;

    res.status(200).json({
      success: true,
      message: 'Gallery item updated successfully',
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete
exports.deleteGalleryItem = async (req, res) => {
  try {
    const item = await ParentingGallery.findByPk(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Gallery item not found' });
    }

    // Delete image from R2
    if (item.image) {
      const key = getKeyFromUrl(item.image);
      if (key) await deleteFromR2(key);
    }

    await item.destroy();

    res.status(200).json({
      success: true,
      message: 'Gallery item deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
