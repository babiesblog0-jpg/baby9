const { BabyFood, Category, User } = require('../models');
const { uploadToR2 } = require('../middleware/upload');
const { deleteFromR2, getKeyFromUrl } = require('../config/r2');

// Create
exports.createBabyFood = async (req, res) => {
  try {
    const { title, description, ingredients, instructions, tips, ageGroup, category, prepTime, servings, nutritionInfo } =
      req.body;

    if (!title || !description || !ingredients || !instructions || !ageGroup || !category) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    // Upload image to R2 if provided
    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToR2(req.file, 'baby-foods');
    }

    const babyFood = await BabyFood.create({
      title,
      description,
      ingredients: typeof ingredients === 'string' ? ingredients.split(',').map(i => i.trim()) : ingredients,
      instructions,
      tips: tips || null,
      ageGroup,
      categoryId: category,
      prepTime,
      servings,
      nutritionInfo: nutritionInfo ? (typeof nutritionInfo === 'string' ? JSON.parse(nutritionInfo) : nutritionInfo) : {},
      image: imageUrl,
      createdById: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: 'Baby food created successfully',
      data: babyFood,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Read all
exports.getAllBabyFoods = async (req, res) => {
  try {
    const { ageGroup, category, isActive } = req.query;
    const where = {};

    if (ageGroup) where.ageGroup = ageGroup;
    if (category) where.categoryId = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const babyFoods = await BabyFood.findAll({
      where,
      include: [
        { model: Category, as: 'category' },
        { model: User, as: 'createdBy', attributes: ['name', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Map to match the frontend expected shape
    const data = babyFoods.map((food) => {
      const json = food.toJSON();
      // Add _id alias for frontend compatibility
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
exports.getBabyFood = async (req, res) => {
  try {
    const babyFood = await BabyFood.findByPk(req.params.id, {
      include: [
        { model: Category, as: 'category' },
        { model: User, as: 'createdBy', attributes: ['name', 'email'] },
      ],
    });

    if (!babyFood) {
      return res.status(404).json({ success: false, message: 'Baby food not found' });
    }

    const data = babyFood.toJSON();
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
exports.updateBabyFood = async (req, res) => {
  try {
    let babyFood = await BabyFood.findByPk(req.params.id);

    if (!babyFood) {
      return res.status(404).json({ success: false, message: 'Baby food not found' });
    }

    // Check authorization
    if (babyFood.createdById !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this resource' });
    }

    const updateData = { ...req.body };
    
    // Map 'category' field to 'categoryId'
    if (updateData.category) {
      updateData.categoryId = updateData.category;
      delete updateData.category;
    }

    if (updateData.ingredients) {
      updateData.ingredients =
        typeof updateData.ingredients === 'string' ? updateData.ingredients.split(',').map(i => i.trim()) : updateData.ingredients;
    }
    if (updateData.nutritionInfo) {
      updateData.nutritionInfo =
        typeof updateData.nutritionInfo === 'string' ? JSON.parse(updateData.nutritionInfo) : updateData.nutritionInfo;
    }

    if (req.file) {
      const newImageUrl = await uploadToR2(req.file, 'baby-foods');
      updateData.image = newImageUrl;
      // Delete old image from R2
      if (babyFood.image) {
        const oldKey = getKeyFromUrl(babyFood.image);
        if (oldKey) await deleteFromR2(oldKey);
      }
    }

    await babyFood.update(updateData);

    const data = babyFood.toJSON();
    data._id = data.id;

    res.status(200).json({
      success: true,
      message: 'Baby food updated successfully',
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete
exports.deleteBabyFood = async (req, res) => {
  try {
    const babyFood = await BabyFood.findByPk(req.params.id);

    if (!babyFood) {
      return res.status(404).json({ success: false, message: 'Baby food not found' });
    }

    // Check authorization
    if (babyFood.createdById !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this resource' });
    }

    // Delete image from R2
    if (babyFood.image) {
      const key = getKeyFromUrl(babyFood.image);
      if (key) await deleteFromR2(key);
    }

    await babyFood.destroy();

    res.status(200).json({
      success: true,
      message: 'Baby food deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
