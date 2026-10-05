const { Category } = require('../models');
const { uploadToR2 } = require('../middleware/upload');
const { deleteFromR2, getKeyFromUrl } = require('../config/r2');

// Create
exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Please provide a category name' });
    }

    // Upload image to R2 if provided
    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToR2(req.file, 'categories');
    }

    const category = await Category.create({
      name,
      image: imageUrl,
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { ...category.toJSON(), _id: category.id },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Read all
exports.getAllCategories = async (req, res) => {
  try {
    const { isActive } = req.query;
    const where = {};

    if (isActive !== undefined) where.isActive = isActive === 'true';

    const categories = await Category.findAll({ where, order: [['createdAt', 'DESC']] });

    const data = categories.map((cat) => {
      const json = cat.toJSON();
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
exports.getCategory = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const data = category.toJSON();
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
exports.updateCategory = async (req, res) => {
  try {
    let category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const updateData = { ...req.body };

    if (req.file) {
      const newImageUrl = await uploadToR2(req.file, 'categories');
      updateData.image = newImageUrl;
      // Delete old image from R2
      if (category.image) {
        const oldKey = getKeyFromUrl(category.image);
        if (oldKey) await deleteFromR2(oldKey);
      }
    }

    await category.update(updateData);

    const data = category.toJSON();
    data._id = data.id;

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Delete image from R2
    if (category.image) {
      const key = getKeyFromUrl(category.image);
      if (key) await deleteFromR2(key);
    }

    await category.destroy();

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
