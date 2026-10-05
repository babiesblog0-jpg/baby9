const { GoogleGenerativeAI } = require('@google/generative-ai');

const isConfigured = () => Boolean(process.env.GEMINI_API_KEY);

/**
 * Ordered list of models to try.
 *
 * Google retires and re-points these aggressively, and each has its own free
 * tier quota, so hardcoding a single name has repeatedly broken this feature:
 *   - "gemini-1.5-flash"     → retired (404)
 *   - "gemini-2.0-flash"     → retired (404)
 *   - "gemini-flash-latest"  → now resolves to gemini-3.7-flash, whose free
 *                              tier allows only 20 requests/day (429s once hit)
 * "gemini-3.6-flash" is the current stable Flash model with a usable free
 * quota (verified live: real recipes returned in ~9s). The rest act as
 * fallbacks so a single deprecation or an exhausted quota degrades gracefully
 * instead of taking the whole feature down.
 *
 * GEMINI_MODEL in .env, if set, is tried first.
 */
const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  'gemini-3.6-flash',
  'gemini-2.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash-lite',
].filter(Boolean);

// Per-attempt timeout. Typical successful calls land around 9s, so 20s
// absorbs normal variance while keeping the overall worst case bounded.
const REQUEST_TIMEOUT_MS = 20000;

const buildModel = (modelName) => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  return genAI.getGenerativeModel(
    {
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        // Low temperature: the feasibility verdict must be consistent and
        // rule-driven, not creative.
        temperature: 0.2,
      },
    },
    { timeout: REQUEST_TIMEOUT_MS }
  );
};

// Kept for backwards compatibility with existing callers/tests.
const getRecipeModel = () => buildModel(MODEL_CANDIDATES[0]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 503/overloaded and timeouts are worth retrying on the SAME model — they're
// momentary capacity blips. 404 (retired) and 429 (quota exhausted) are not:
// retrying can never help, so we move straight to the next model instead.
const isRetryableOnSameModel = (message = '') =>
  /\b(503|UNAVAILABLE|overloaded|high demand|timeout|aborted)\b/i.test(message);

const isModelUnusable = (message = '') =>
  /\b(404|NOT_FOUND|429|RESOURCE_EXHAUSTED|quota|no longer available|not found)\b/i.test(message);

/**
 * Generates content, transparently falling back across MODEL_CANDIDATES.
 *
 * For each model: try once, retry once on a transient blip, then give up on
 * that model and try the next. A model that is retired or out of quota is
 * skipped immediately without burning a retry.
 *
 * The `model` argument is accepted (and ignored) so existing call sites that
 * pass getRecipeModel() keep working unchanged.
 */
const generateWithRetry = async (_model, prompt, { retriesPerModel = 1, baseDelayMs = 800 } = {}) => {
  let lastError;

  for (const modelName of MODEL_CANDIDATES) {
    const model = buildModel(modelName);

    for (let attempt = 0; attempt <= retriesPerModel; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        if (modelName !== MODEL_CANDIDATES[0]) {
          console.log(`AI mixer: served by fallback model "${modelName}"`);
        }
        return result;
      } catch (error) {
        lastError = error;
        const message = error.message || '';

        if (isModelUnusable(message)) {
          console.warn(`AI mixer: model "${modelName}" unusable (${message.slice(0, 120)}) — trying next`);
          break; // straight to the next candidate model
        }

        if (isRetryableOnSameModel(message) && attempt < retriesPerModel) {
          await sleep(baseDelayMs * (attempt + 1));
          continue;
        }

        break; // out of retries for this model — fall through to the next
      }
    }
  }

  throw lastError;
};

module.exports = { isConfigured, getRecipeModel, generateWithRetry, MODEL_CANDIDATES };
