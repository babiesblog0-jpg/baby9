const { FingerFood } = require('../models');
const { uploadToR2 } = require('../middleware/upload');
const { deleteFromR2, getKeyFromUrl } = require('../config/r2');

// Create
exports.createFingerFood = async (req, res) => {
  try {
    const { name, description, icon, minAgeMonths, isActive } = req.body;

    if (!name || !description) {
      return res.status(400).json({ success: false, message: 'Please provide name and description' });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToR2(req.file, 'finger-foods');
    }

    if (!imageUrl && !icon) {
      return res.status(400).json({ success: false, message: 'Please provide either an image or an emoji icon' });
    }

    const fingerFood = await FingerFood.create({
      name,
      description,
      icon: imageUrl ? null : icon,
      image: imageUrl,
      minAgeMonths: minAgeMonths !== undefined ? Number(minAgeMonths) : 10,
      isActive: isActive !== undefined ? isActive === true || isActive === 'true' : true,
    });

    res.status(201).json({
      success: true,
      message: 'Finger food created successfully',
      data: { ...fingerFood.toJSON(), _id: fingerFood.id },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Read all — supports ?ageMonths=11 (items unlocked at that age) and ?isActive=
exports.getAllFingerFoods = async (req, res) => {
  try {
    const { isActive, ageMonths } = req.query;
    const where = {};

    if (isActive !== undefined) where.isActive = isActive === 'true';

    const fingerFoods = await FingerFood.findAll({
      where,
      order: [
        ['minAgeMonths', 'ASC'],
        ['name', 'ASC'],
      ],
    });

    let data = fingerFoods.map((item) => {
      const json = item.toJSON();
      json._id = json.id;
      return json;
    });

    if (ageMonths !== undefined) {
      const age = Number(ageMonths);
      data = data.filter((item) => item.minAgeMonths <= age);
    }

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Read one
exports.getFingerFood = async (req, res) => {
  try {
    const fingerFood = await FingerFood.findByPk(req.params.id);

    if (!fingerFood) {
      return res.status(404).json({ success: false, message: 'Finger food not found' });
    }

    const data = fingerFood.toJSON();
    data._id = data.id;

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update
exports.updateFingerFood = async (req, res) => {
  try {
    const fingerFood = await FingerFood.findByPk(req.params.id);

    if (!fingerFood) {
      return res.status(404).json({ success: false, message: 'Finger food not found' });
    }

    const updateData = { ...req.body };
    if (updateData.minAgeMonths !== undefined) updateData.minAgeMonths = Number(updateData.minAgeMonths);
    if (updateData.isActive !== undefined) updateData.isActive = updateData.isActive === true || updateData.isActive === 'true';

    if (req.file) {
      const newImageUrl = await uploadToR2(req.file, 'finger-foods');
      updateData.image = newImageUrl;
      updateData.icon = null;
      if (fingerFood.image) {
        const oldKey = getKeyFromUrl(fingerFood.image);
        if (oldKey) await deleteFromR2(oldKey);
      }
    } else if (updateData.icon) {
      updateData.image = null;
      if (fingerFood.image) {
        const oldKey = getKeyFromUrl(fingerFood.image);
        if (oldKey) await deleteFromR2(oldKey);
      }
    }

    await fingerFood.update(updateData);

    const data = fingerFood.toJSON();
    data._id = data.id;

    res.status(200).json({
      success: true,
      message: 'Finger food updated successfully',
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete
exports.deleteFingerFood = async (req, res) => {
  try {
    const fingerFood = await FingerFood.findByPk(req.params.id);

    if (!fingerFood) {
      return res.status(404).json({ success: false, message: 'Finger food not found' });
    }

    if (fingerFood.image) {
      const key = getKeyFromUrl(fingerFood.image);
      if (key) await deleteFromR2(key);
    }

    await fingerFood.destroy();

    res.status(200).json({ success: true, message: 'Finger food deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
