const { SiteSetting } = require('../models');

// The only keys that exist, with the text each starts with. Anything else is
// rejected, so the public read route can't be used to probe or fill the table.
const DEFAULTS = {
  'shop-disclaimer':
    'Disclaimer: eBooks is for general educational and informational purposes only and are not a substitute for professional medical or dietary advice. Always consult your pediatrician if you have any doubts',
};

const MAX_LENGTH = 1000;

// Get (public). The first read of a key stores its default, so the row is in
// the database from then on and the admin edits a real value.
exports.getSetting = async (req, res) => {
  try {
    const { key } = req.params;
    if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) {
      return res.status(404).json({ success: false, message: 'Setting not found' });
    }

    const [setting] = await SiteSetting.findOrCreate({
      where: { key },
      defaults: { key, value: DEFAULTS[key] },
    });

    res.status(200).json({ success: true, data: { key: setting.key, value: setting.value } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update (admin). An empty value is allowed and hides the text on the site.
exports.updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) {
      return res.status(404).json({ success: false, message: 'Setting not found' });
    }

    const value = String(req.body?.value ?? '').replace(/\s+/g, ' ').trim();
    if (value.length > MAX_LENGTH) {
      return res
        .status(400)
        .json({ success: false, message: `Text must be ${MAX_LENGTH} characters or fewer` });
    }

    await SiteSetting.upsert({ key, value });

    res.status(200).json({ success: true, message: 'Setting updated successfully', data: { key, value } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
