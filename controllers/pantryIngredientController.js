const { PantryIngredient } = require('../models');
const { uploadToR2 } = require('../middleware/upload');
const { deleteFromR2, getKeyFromUrl } = require('../config/r2');

// Create
exports.createPantryIngredient = async (req, res) => {
  try {
    const { name, icon, categoryGroup, minAgeMonths, isActive } = req.body;

    if (!name || !categoryGroup) {
      return res.status(400).json({ success: false, message: 'Please provide name and category heading' });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToR2(req.file, 'pantry-ingredients');
    }

    if (!imageUrl && !icon) {
      return res.status(400).json({ success: false, message: 'Please provide either an image or an emoji icon' });
    }

    const ingredient = await PantryIngredient.create({
      name,
      icon: imageUrl ? null : icon,
      image: imageUrl,
      categoryGroup,
      minAgeMonths: minAgeMonths !== undefined ? Number(minAgeMonths) : undefined,
      isActive: isActive !== undefined ? isActive === true || isActive === 'true' : true,
    });

    res.status(201).json({
      success: true,
      message: 'Pantry ingredient created successfully',
      data: { ...ingredient.toJSON(), _id: ingredient.id },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Read all (flat, or age-gated + grouped when ?ageMonths is present)
exports.getAllPantryIngredients = async (req, res) => {
  try {
    const { categoryGroup, isActive, ageMonths } = req.query;
    const where = {};

    if (categoryGroup) where.categoryGroup = categoryGroup;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    if (ageMonths !== undefined) {
      // Age-gated view for the mixer page: only active ingredients, grouped
      // by whichever category headings currently exist (admin-defined,
      // sorted alphabetically), each annotated with `unlocked`.
      where.isActive = true;
      const age = Number(ageMonths);

      const ingredients = await PantryIngredient.findAll({ where, order: [['categoryGroup', 'ASC'], ['name', 'ASC']] });

      const grouped = {};
      ingredients.forEach((item) => {
        const json = item.toJSON();
        json._id = json.id;
        json.unlocked = json.minAgeMonths <= age;
        if (!grouped[json.categoryGroup]) grouped[json.categoryGroup] = [];
        grouped[json.categoryGroup].push(json);
      });

      // This catalog only changes when an admin edits it, so it's safe for
      // browsers to reuse a recent response instead of round-tripping to
      // Neon on every page load — this is the main thing making the pantry
      // feel slow to open.
      res.set('Cache-Control', 'public, max-age=120');

      return res.status(200).json({
        success: true,
        ageMonths: age,
        data: grouped,
      });
    }

    const ingredients = await PantryIngredient.findAll({ where, order: [['createdAt', 'DESC']] });

    const data = ingredients.map((item) => {
      const json = item.toJSON();
      json._id = json.id;
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
exports.getPantryIngredient = async (req, res) => {
  try {
    const ingredient = await PantryIngredient.findByPk(req.params.id);

    if (!ingredient) {
      return res.status(404).json({ success: false, message: 'Pantry ingredient not found' });
    }

    const data = ingredient.toJSON();
    data._id = data.id;

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update
exports.updatePantryIngredient = async (req, res) => {
  try {
    const ingredient = await PantryIngredient.findByPk(req.params.id);

    if (!ingredient) {
      return res.status(404).json({ success: false, message: 'Pantry ingredient not found' });
    }

    const updateData = { ...req.body };
    if (updateData.minAgeMonths !== undefined) updateData.minAgeMonths = Number(updateData.minAgeMonths);
    if (updateData.isActive !== undefined) updateData.isActive = updateData.isActive === true || updateData.isActive === 'true';

    if (req.file) {
      const newImageUrl = await uploadToR2(req.file, 'pantry-ingredients');
      updateData.image = newImageUrl;
      updateData.icon = null;
      if (ingredient.image) {
        const oldKey = getKeyFromUrl(ingredient.image);
        if (oldKey) await deleteFromR2(oldKey);
      }
    } else if (updateData.icon) {
      updateData.image = null;
      if (ingredient.image) {
        const oldKey = getKeyFromUrl(ingredient.image);
        if (oldKey) await deleteFromR2(oldKey);
      }
    }

    await ingredient.update(updateData);

    const data = ingredient.toJSON();
    data._id = data.id;

    res.status(200).json({
      success: true,
      message: 'Pantry ingredient updated successfully',
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete
exports.deletePantryIngredient = async (req, res) => {
  try {
    const ingredient = await PantryIngredient.findByPk(req.params.id);

    if (!ingredient) {
      return res.status(404).json({ success: false, message: 'Pantry ingredient not found' });
    }

    if (ingredient.image) {
      const key = getKeyFromUrl(ingredient.image);
      if (key) await deleteFromR2(key);
    }

    await ingredient.destroy();

    res.status(200).json({ success: true, message: 'Pantry ingredient deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
