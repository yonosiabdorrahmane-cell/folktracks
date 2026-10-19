/* ═══ Folktracks — meal photo estimation ══════════════════════════════════
   Barcodes only exist on things that came out of a factory. A tagine, a
   plate of couscous, whatever you actually cooked — none of it carries
   one. This asks a vision model to look at a photo and estimate what is
   on the plate.

   ── Where the API key lives ───────────────────────────────────────────
   Folktracks has no backend. It is a folder of static files, so there is no
   server-side place to keep a secret: anything shipped in the JS is
   readable by anyone who opens the page. The key is therefore the user's
   own, entered in Settings and held in localStorage on that device.

   It is stored under its own key rather than inside the app state,
   because the app state is what "Export my data" serialises — a secret
   inside it would ride along into every backup the user shares.
   ═══════════════════════════════════════════════════════════════════ */

const KEY_STORE = 'zenith.ai.key';
const MODEL_STORE = 'zenith.ai.model';
export const DEFAULT_MODEL = 'gemini-2.5-flash';
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

const read = k => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
const write = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch { /* private mode */ } };

export const getKey = () => read(KEY_STORE).trim();
export const setKey = v => write(KEY_STORE, (v || '').trim());
export const hasKey = () => getKey().length > 12;
export const getModel = () => read(MODEL_STORE).trim() || DEFAULT_MODEL;
export const setModel = v => write(MODEL_STORE, (v || '').trim());

/* The response shape. `propertyOrdering` pins the field order so the
   model emits the same structure every time, and `responseMimeType`
   makes it JSON rather than prose we would have to pick apart. */
const FIELDS = [
  'dish', 'items', 'portion_g', 'kcal',
  'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g', 'satfat_g', 'sodium_mg',
  'confidence',
];
const SCHEMA = {
  type: 'OBJECT',
  properties: {
    dish: { type: 'STRING' },
    items: { type: 'ARRAY', items: { type: 'STRING' } },
    portion_g: { type: 'NUMBER' },
    kcal: { type: 'NUMBER' },
    protein_g: { type: 'NUMBER' },
    carbs_g: { type: 'NUMBER' },
    fat_g: { type: 'NUMBER' },
    fiber_g: { type: 'NUMBER' },
    sugar_g: { type: 'NUMBER' },
    satfat_g: { type: 'NUMBER' },
    sodium_mg: { type: 'NUMBER' },
    confidence: { type: 'STRING', enum: ['low', 'medium', 'high'] },
  },
  required: FIELDS,
  propertyOrdering: FIELDS,
};

const PROMPT = `You are estimating the nutrition of one serving of food from a photograph.

Report values for the WHOLE portion visible in the photo, not per 100 g.

Work like this:
- Identify every distinct component you can see and list them in "items".
- Judge the portion size using the plate, bowl, cutlery or hands for scale. A dinner plate is about 27 cm across.
- Account for how it was cooked: visible oil, butter, frying and sauces carry a large share of the calories.
- "dish" is a short human name for the meal, in English.
- "portion_g" is the total edible weight in grams, excluding plate and bones.
- "confidence" is "high" only when the food and the portion are both plainly readable; "low" when the photo is unclear, the food is largely hidden, or the scale is ambiguous.

Estimate honestly. A plausible number is more useful than a cautious one, but do not invent precision the photo cannot support.`;

/** Downscale and re-encode, because a 12 MP phone photo is megabytes of
    upload for detail the model does not use. */
export function fileToBase64(file, { maxSide = 900, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      const dataUrl = c.toDataURL('image/jpeg', quality);
      resolve({ base64: dataUrl.split(',')[1], mime: 'image/jpeg', preview: dataUrl });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image-decode')); };
    img.src = url;
  });
}

const num = v => (Number.isFinite(+v) && +v >= 0 ? +v : 0);

/**
 * Send a photo for estimation.
 * Resolves to values scaled per 100 g, which is the unit everything else
 * in the app speaks, plus the portion the model actually judged.
 */
export async function analyseMeal({ base64, mime }, { signal } = {}) {
  const key = getKey();
  if (!key) throw new Error('no-key');

  const res = await fetch(`${ENDPOINT}/${encodeURIComponent(getModel())}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: PROMPT }, { inline_data: { mime_type: mime, data: base64 } }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: SCHEMA },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    if (res.status === 400 && /API key/i.test(detail)) throw new Error('bad-key');
    if (res.status === 403) throw new Error('bad-key');
    if (res.status === 429) throw new Error('rate-limit');
    throw new Error(`gemini-${res.status}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('') || '';
  if (!text) throw new Error('empty');

  let out;
  try { out = JSON.parse(text); }
  catch {
    // Structured output should make this impossible, but a model that
    // wraps its JSON in prose should not cost the user their photo.
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('unparsable');
    out = JSON.parse(m[0]);
  }

  const grams = Math.max(1, num(out.portion_g));
  const whole = {
    kcal: num(out.kcal),
    protein: num(out.protein_g),
    carbs: num(out.carbs_g),
    fat: num(out.fat_g),
    fiber: num(out.fiber_g),
    sugar: num(out.sugar_g),
    satfat: num(out.satfat_g),
    sodium: num(out.sodium_mg),
  };

  // If the stated energy disagrees badly with its own macros, trust the
  // macros — they are the harder thing to get wrong by a factor.
  const fromMacros = whole.protein * 4 + whole.carbs * 4 + whole.fat * 9;
  if (!whole.kcal || (fromMacros > 40 && Math.abs(fromMacros - whole.kcal) > whole.kcal * 0.45)) {
    whole.kcal = Math.round(fromMacros);
  }

  const k = 100 / grams;
  const per100 = {};
  for (const [f, v] of Object.entries(whole)) per100[f] = Math.round(v * k * 10) / 10;

  return {
    dish: String(out.dish || '').slice(0, 80) || 'Meal',
    items: Array.isArray(out.items) ? out.items.map(String).slice(0, 12) : [],
    confidence: ['low', 'medium', 'high'].includes(out.confidence) ? out.confidence : 'low',
    grams: Math.round(grams),
    per100,
    whole,
  };
}
