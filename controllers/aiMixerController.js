const { PantryIngredient } = require('../models');
const { isConfigured, getRecipeModel, generateWithRetry } = require('../config/gemini');

// Category headings that can never carry a dish on their own — a bowl made
// only of these is rejected deterministically, before any AI call.
const SUPPORT_ONLY_GROUPS = ['Herbs & Spices'];

const NOT_POSSIBLE_FALLBACK =
  'No compatible dish is possible with this mix. Try starting from a base like a fruit, vegetable, or grain.';

/**
 * Feasibility-first prompt. The model must PASS the combination through an
 * explicit compatibility rubric (default: reject) before it is allowed to
 * write a recipe. Few-shot verdicts anchor the judgment so it stays strict.
 */
const buildRecipePrompt = ({ ageMonths, items }) => `You are a strict pediatric nutritionist. Your reputation depends on NEVER inventing dishes that no real nutritionist would serve. Rejecting a bad combination is a correct, successful answer.

Baby's age: ${ageMonths} months.
Selected ingredients (with their pantry category):
${items.map((i) => `- ${i.name} (${i.categoryGroup})`).join('\n')}

STEP 1 — COMPATIBILITY VERDICT. The combination is feasible ONLY if ALL of these pass:
1. BASE RULE — there is at least one substantial base ingredient (a fruit, vegetable, grain, legume, protein, or dairy). Spices, herbs, and aromatics are support-only and can never be the dish.
2. FLAVOUR-FAMILY RULE — savoury aromatics (garlic, cumin, turmeric, ginger, coriander, fennel, leek, onion family) belong ONLY with savoury bases (vegetables, legumes, grains, proteins). They NEVER pair with sweet fruit as the main base. Sweet spices (cinnamon, cardamom, nutmeg) belong ONLY with fruits, grains, or dairy.
3. COHESION RULE — every ingredient must belong to ONE single dish a parent would recognise (a purée, mash, porridge, or blend). If any ingredient would have to be forced in, the whole combination fails.
4. REAL-WORLD RULE — the dish must be something an experienced baby-food author would actually publish. When in doubt, REJECT. Do not be creative to please the user.
Water, breast milk, or formula may be assumed for consistency; nothing else may be added.

Calibration examples — follow these verdicts exactly:
- turmeric + guava → NOT feasible (savoury spice forced onto sweet fruit)
- garlic + banana → NOT feasible (savoury aromatic with sweet fruit)
- turmeric + watermelon → NOT feasible
- cinnamon alone → NOT feasible (no base)
- ginger + cumin + cardamom → NOT feasible (spices only, no base)
- apple + banana + oats → feasible (fruit porridge)
- carrot + red lentils + cumin → feasible (savoury dal, spice supports savoury base)
- apple + cinnamon → feasible (sweet spice with fruit)
- sweet potato + spinach → feasible (vegetable mash)

STEP 2 — RESPONSE. Respond with STRICT JSON only (no markdown, no backticks, no prose outside the JSON).

If NOT feasible:
{
  "feasible": false,
  "reason": "string — one friendly sentence: say no compatible dish is possible, name the clashing ingredients, and suggest what to add or remove"
}

If feasible:
{
  "feasible": true,
  "title": "string",
  "categoryTag": "string, e.g. Mashed Foods",
  "ageRangeLabel": "string, e.g. ${ageMonths}-${Math.min(ageMonths + 2, 12)} months",
  "description": "string, one warm paragraph",
  "ingredients": [{ "name": "string", "amount": "string" }],
  "instructions": ["step 1", "step 2"],
  "tips": "string, one or two sentences",
  "nutrition": "string, one or two sentences"
}`;

/**
 * Tolerant parse of the model's JSON reply. If the JSON is malformed but the
 * verdict is clearly a rejection, honor the rejection (with the standard
 * fallback reason) rather than surfacing a retry error to the parent.
 */
const parseRecipeJson = (text) => {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (parseError) {
    if (/"feasible"\s*:\s*false/.test(cleaned)) {
      return { feasible: false, reason: null };
    }
    return null;
  }
};

exports.generateRecipe = async (req, res) => {
  try {
    if (!isConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'AI recipe generation is not configured yet. Add GEMINI_API_KEY to the backend .env file.',
      });
    }

    const { ageMonths, ingredientIds } = req.body;
    const age = Number(ageMonths);

    if (!age || age < 6 || age > 12) {
      return res.status(400).json({ success: false, message: 'Please provide a valid ageMonths between 6 and 12.' });
    }

    if (!Array.isArray(ingredientIds) || ingredientIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide at least one ingredientId.' });
    }

    // Never trust client-supplied ingredient names — re-derive them and
    // re-enforce the age-gating rule server-side.
    const ingredients = await PantryIngredient.findAll({
      where: { id: ingredientIds, isActive: true },
    });

    const eligible = ingredients.filter((i) => i.minAgeMonths <= age);

    if (eligible.length === 0) {
      return res.status(400).json({ success: false, message: 'None of the selected ingredients are safe for this age.' });
    }

    // Deterministic guard: a bowl of only spices/herbs can never be a dish —
    // reject immediately without spending an AI call.
    const hasBase = eligible.some((i) => !SUPPORT_ONLY_GROUPS.includes(i.categoryGroup));
    if (!hasBase) {
      return res.status(200).json({
        success: true,
        data: {
          feasible: false,
          reason:
            'No compatible dish is possible — spices and herbs are only supporting flavours. Add a base like a fruit, vegetable, or grain first.',
        },
      });
    }

    const items = eligible.map((i) => ({ name: i.name, categoryGroup: i.categoryGroup }));
    const model = getRecipeModel();
    const result = await generateWithRetry(model, buildRecipePrompt({ ageMonths: age, items }));
    const text = result.response.text();

    const recipe = parseRecipeJson(text);
    if (!recipe) {
      return res.status(502).json({ success: false, message: 'Could not generate a recipe right now. Please try again.' });
    }

    // Honest rejection: no compatible dish exists for this mix.
    if (recipe.feasible !== true) {
      return res.status(200).json({
        success: true,
        data: {
          feasible: false,
          reason: recipe.reason || NOT_POSSIBLE_FALLBACK,
        },
      });
    }

    res.status(200).json({ success: true, data: { ...recipe, feasible: true } });
  } catch (error) {
    console.error('AI mixer error:', error.message);
    res.status(502).json({ success: false, message: 'Could not generate a recipe right now. Please try again.' });
  }
};
