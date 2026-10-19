/* ═══ Folktracks — 1D barcode decoder ═════════════════════════════════════
   The Barcode Detection API is a Chrome-on-Android feature; WebKit has
   never shipped it, so on the iPhone this app is built for there is no
   platform decoder at all. This is ours.

   Reads EAN-13, EAN-8, UPC-A, UPC-E, ITF-14 and Code 128 — between them
   effectively every barcode printed on a grocery item. UPC-A is EAN-13
   with a leading zero, and UPC-E expands into one, so both come back as
   13 digits, which is what Open Food Facts is keyed on.

   Getting a format list right is the easy half. What actually decides
   whether a real packet in a real kitchen scans is the other half:
     · bars are not always vertical      → scan columns as well as rows
     · light is not even                 → threshold locally, not globally
     · barcodes are not always centred   → sweep many lines, both axes
     · phones focus badly up close       → try more than one scale
   ═══════════════════════════════════════════════════════════════════ */

/* ── EAN / UPC ──────────────────────────────────────────────────────
   Each digit is 7 modules drawn as 4 alternating runs. These are the
   L-pattern run widths; R-patterns (right half) are the colour inverse
   and measure identically, and G-patterns are these reversed — which is
   how EAN-13 hides its 13th digit in the parity of the other six. */
const DIGITS = [
  [3, 2, 1, 1], [2, 2, 2, 1], [2, 1, 2, 2], [1, 4, 1, 1], [1, 1, 3, 2],
  [1, 2, 3, 1], [1, 1, 1, 4], [1, 3, 1, 2], [1, 2, 1, 3], [3, 1, 1, 2],
];
const DIGITS_LG = [...DIGITS, ...DIGITS.map(d => [...d].reverse())];

const FIRST_DIGIT = [0x00, 0x0b, 0x0d, 0x0e, 0x13, 0x19, 0x1c, 0x15, 0x16, 0x1a];

/* UPC-E encodes six digits whose parity spells out the check digit.
   Bit set = that position uses G. Number system 1 inverts the lot. */
const UPCE_PARITY = [0x38, 0x34, 0x32, 0x31, 0x2c, 0x26, 0x23, 0x2a, 0x29, 0x25];

const GUARD = [1, 1, 1];
const MIDDLE = [1, 1, 1, 1, 1];
const UPCE_END = [1, 1, 1, 1, 1, 1];

/* ── ITF-14 ─────────────────────────────────────────────────────────
   Interleaved 2 of 5: five bars carry one digit while the five spaces
   between them carry the next. Two of every five are wide. */
const ITF = [
  [0,0,1,1,0], [1,0,0,0,1], [0,1,0,0,1], [1,1,0,0,0], [0,0,1,0,1],
  [1,0,1,0,0], [0,1,1,0,0], [0,0,0,1,1], [1,0,0,1,0], [0,1,0,1,0],
];

/* ── Code 128 ───────────────────────────────────────────────────────
   107 symbols of six runs each, widths 1-4, packed as digit strings. */
const C128 = ('212222222122222221121223121322131222122213122312132212221213221312231212112232122132122231113222' +
  '123122123221223211221132221231213212223112312131311222321122321221312212322112322211212123212321232121' +
  '111323131123131321112313132113132311211313231113231311112133112331132131113123113321133121313121211331' +
  '231131213113213311213131311123311321331121312113312311332111314111221411431111111224111422121124121421' +
  '141122141221112214112412122114122411142112142211241211221114413111241112134111111242121142121241114212' +
  '124112124211411212421112421211212141214121412121111143111341131141114113114311411113411311113141114131' +
  '311141411131211412211214211232').match(/.{6}/g).map(s => [...s].map(Number));
const C128_STOP = [2, 3, 3, 1, 1, 1, 2];

const MAX_AVG_VARIANCE = 0.48;
const MAX_INDIVIDUAL_VARIANCE = 0.7;

/** How badly measured runs fit a reference pattern, scale-invariant. */
function variance(counters, pattern, maxIndividual) {
  const n = pattern.length;
  let total = 0, patternTotal = 0;
  for (let i = 0; i < n; i++) { total += counters[i]; patternTotal += pattern[i]; }
  if (total < patternTotal) return Infinity;
  const unit = total / patternTotal;
  const maxVar = unit * maxIndividual;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const diff = Math.abs(counters[i] - pattern[i] * unit);
    if (diff > maxVar) return Infinity;
    sum += diff;
  }
  return sum / total;
}

function bestMatch(runs, offset, table, width, maxAvg = MAX_AVG_VARIANCE) {
  if (offset + width > runs.length) return -1;
  const counters = runs.slice(offset, offset + width);
  let best = -1, bestVar = maxAvg;
  for (let d = 0; d < table.length; d++) {
    const v = variance(counters, table[d], MAX_INDIVIDUAL_VARIANCE);
    if (v < bestVar) { bestVar = v; best = d; }
  }
  return best;
}

function matches(runs, offset, pattern) {
  if (offset + pattern.length > runs.length) return false;
  return variance(runs.slice(offset, offset + pattern.length), pattern, MAX_INDIVIDUAL_VARIANCE) < MAX_AVG_VARIANCE;
}

/** EAN/UPC/ITF check digit: weights of 3 and 1 alternating from the right. */
export function checksumOk(code) {
  if (!/^\d+$/.test(code)) return false;
  const d = [...code].map(Number);
  const check = d.pop();
  let sum = 0;
  for (let i = d.length - 1, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) sum += d[i] * w;
  return (10 - (sum % 10)) % 10 === check;
}

/* ── Thresholding ───────────────────────────────────────────────────
   Two strategies, because real captures fail in two different ways.
   A histogram valley handles an evenly lit barcode well and is cheap.
   A moving local average is what rescues the ones with a highlight
   across the middle or a shadow down one side, where any single global
   threshold puts half the symbol on the wrong side. */

function histogramThreshold(line) {
  const buckets = new Uint32Array(32);
  for (let i = 0; i < line.length; i++) buckets[line[i] >> 3]++;

  let firstPeak = 0, firstMax = 0;
  for (let i = 0; i < 32; i++) if (buckets[i] > firstMax) { firstMax = buckets[i]; firstPeak = i; }

  let secondPeak = 0, secondScore = 0;
  for (let i = 0; i < 32; i++) {
    const dist = i - firstPeak;
    const score = buckets[i] * dist * dist;
    if (score > secondScore) { secondScore = score; secondPeak = i; }
  }
  let lo = Math.min(firstPeak, secondPeak), hi = Math.max(firstPeak, secondPeak);
  if (hi - lo <= 4) return -1;                       // no real black/white split

  let valley = lo, valleyScore = -1;
  for (let i = lo + 1; i < hi; i++) {
    const d = i - lo, e = hi - i;
    const score = d * e * (firstMax - buckets[i]);   // deep and central wins
    if (score > valleyScore) { valleyScore = score; valley = i; }
  }
  return (valley << 3) + 4;
}

/** Local mean over a sliding window, via a prefix sum. */
function localThresholds(line) {
  const n = line.length;
  const win = Math.max(12, Math.round(n / 12));
  const pre = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + line[i];
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - win), b = Math.min(n, i + win + 1);
    out[i] = (pre[b] - pre[a]) / (b - a);
  }
  return out;
}

/** Alternating run lengths, or null when the line cannot hold a symbol. */
function toRuns(line, local) {
  let min = 255, max = 0;
  for (let i = 0; i < line.length; i++) {
    const v = line[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (max - min < 40) return null;

  let thresh = null, flat = 0;
  if (local) thresh = localThresholds(line);
  else {
    flat = histogramThreshold(line);
    if (flat < 0) flat = (min + max) / 2;
  }

  const runs = [];
  const isDark = i => line[i] < (thresh ? thresh[i] : flat);
  let dark = isDark(0);
  const firstIsDark = dark;
  let len = 0;
  for (let i = 0; i < line.length; i++) {
    const d = isDark(i);
    if (d === dark) { len++; continue; }
    runs.push(len); dark = d; len = 1;
  }
  runs.push(len);
  return runs.length < 12 ? null : { runs, firstIsDark };
}

/* ── EAN-13 / EAN-8 / UPC-A ─────────────────────────────────────── */
const EAN_FORMATS = [
  { name: 'ean_13', perSide: 6, parity: true, modules: 95 },
  { name: 'ean_8', perSide: 4, parity: false, modules: 67 },
];

function tryEan(runs, guardAt, { name, perSide, parity, modules }) {
  const digits = [];
  let lgBits = 0, p = guardAt + 3;

  for (let k = 0; k < perSide; k++, p += 4) {
    const d = bestMatch(runs, p, parity ? DIGITS_LG : DIGITS, 4);
    if (d < 0) return null;
    digits.push(d % 10);
    if (parity && d >= 10) lgBits |= 1 << (perSide - 1 - k);
  }
  if (!matches(runs, p, MIDDLE)) return null;
  p += MIDDLE.length;

  for (let k = 0; k < perSide; k++, p += 4) {
    const d = bestMatch(runs, p, DIGITS, 4);
    if (d < 0) return null;
    digits.push(d);
  }
  if (!matches(runs, p, GUARD)) return null;
  const endAt = p;
  p += 3;
  if (!quietAfter(runs, p, runs[endAt] + runs[endAt + 1] + runs[endAt + 2])) return null;
  if (!widthConsistent(runs, guardAt, endAt + 3, modules)) return null;

  if (parity) {
    const first = FIRST_DIGIT.indexOf(lgBits);
    if (first < 0) return null;
    digits.unshift(first);
  }
  const code = digits.join('');
  return checksumOk(code) ? { rawValue: code, format: name } : null;
}

/* ── UPC-E ──────────────────────────────────────────────────────────
   Six digits, no centre guard, a six-module end guard, and the check
   digit recovered from the parity word. Expanded to a 13-digit EAN so
   callers never have to care which of the two was on the packet. */
function tryUpcE(runs, guardAt) {
  const digits = [];
  let lgBits = 0, p = guardAt + 3;
  // Only 51 modules, against EAN-13's 95, and the check digit is recovered
  // from the parity word rather than read independently — so it gets less
  // slack per digit than the long formats do.
  for (let k = 0; k < 6; k++, p += 4) {
    const d = bestMatch(runs, p, DIGITS_LG, 4, 0.32);
    if (d < 0) return null;
    digits.push(d % 10);
    if (d >= 10) lgBits |= 1 << (5 - k);
  }
  if (!matches(runs, p, UPCE_END)) return null;
  const endAt = p;

  // Every element of the end guard is one module; if they disagree, the
  // "guard" is texture that happened to alternate six times.
  const unit = (runs[guardAt] + runs[guardAt + 1] + runs[guardAt + 2]) / 3;
  for (let k = 0; k < UPCE_END.length; k++) {
    const r = runs[endAt + k];
    if (r < unit * 0.6 || r > unit * 1.6) return null;
  }

  p += UPCE_END.length;
  if (!quietAfter(runs, p, unit * 3)) return null;
  if (!widthConsistent(runs, guardAt, endAt + UPCE_END.length, 51, 0.2)) return null;

  // Number system 0 uses the table as-is; number system 1 inverts it.
  let system = 0, check = UPCE_PARITY.indexOf(lgBits);
  if (check < 0) { system = 1; check = UPCE_PARITY.indexOf(lgBits ^ 0x3f); }
  if (check < 0) return null;

  const [a, b, c, d, e, f] = digits;
  let mid;
  if (f <= 2) mid = `${a}${b}${f}0000${c}${d}${e}`;
  else if (f === 3) mid = `${a}${b}${c}00000${d}${e}`;
  else if (f === 4) mid = `${a}${b}${c}${d}00000${e}`;
  else mid = `${a}${b}${c}${d}${e}0000${f}`;

  const upcA = `${system}${mid}${check}`;
  if (!checksumOk(upcA)) return null;
  return { rawValue: `0${upcA}`, format: 'upc_e' };
}

function quietAfter(runs, at, need) {
  return at >= runs.length || runs[at] >= need * 0.8;
}

/** A real symbol is exactly `modules` wide, so the unit implied by its
    total width must agree with the unit implied by the start guard.
    Noise fakes digit patterns and even check digits; it almost never
    holds one module width across the whole symbol. */
function widthConsistent(runs, from, to, modules, tol = 0.32) {
  let total = 0;
  for (let k = from; k < to; k++) total += runs[k];
  const fromGuard = (runs[from] + runs[from + 1] + runs[from + 2]) / 3;
  const fromTotal = total / modules;
  return Math.abs(fromGuard - fromTotal) <= fromTotal * tol;
}

/* ── ITF-14 ─────────────────────────────────────────────────────── */
function tryItf(runs, at) {
  // start = four narrow runs
  if (!matches(runs, at, [1, 1, 1, 1])) return null;
  if (at === 0) return null;
  const unit = (runs[at] + runs[at + 1] + runs[at + 2] + runs[at + 3]) / 4;
  if (runs[at - 1] < unit * 3) return null;         // quiet zone
  let p = at + 4;
  const digits = [];
  for (let pair = 0; pair < 7; pair++, p += 10) {
    if (p + 10 > runs.length) return null;
    const bars = [runs[p], runs[p + 2], runs[p + 4], runs[p + 6], runs[p + 8]];
    const spaces = [runs[p + 1], runs[p + 3], runs[p + 5], runs[p + 7], runs[p + 9]];
    // The narrow element is fixed for the whole symbol; drifting means
    // this is texture, not a barcode.
    for (const set of [bars, spaces]) {
      const narrow = [...set].sort((a, b) => a - b).slice(0, 3).reduce((a, b) => a + b, 0) / 3;
      if (narrow < unit * 0.6 || narrow > unit * 1.7) return null;
    }
    const d1 = itfDigit(bars), d2 = itfDigit(spaces);
    if (d1 < 0 || d2 < 0) return null;
    digits.push(d1, d2);
  }
  if (!matches(runs, p, [2, 1, 1])) return null;
  const code = digits.join('');
  // Only accept full ITF-14. Shorter interleaved reads are the classic
  // way this symbology produces confident nonsense.
  return code.length === 14 && checksumOk(code) ? { rawValue: code, format: 'itf' } : null;
}

function itfDigit(five) {
  // "Wider than the mean" is nearly always satisfiable by noise, which is
  // how interleaved 2 of 5 earns its reputation for confident nonsense.
  // Demand a real two-population split instead: three narrows that agree,
  // two wides that agree, and a clear gap between them.
  const sorted = [...five].sort((a, b) => a - b);
  const narrow = (sorted[0] + sorted[1] + sorted[2]) / 3;
  const wide = (sorted[3] + sorted[4]) / 2;
  if (wide < narrow * 1.6) return -1;
  if (sorted[2] > narrow * 1.4) return -1;
  if (sorted[4] > wide * 1.4) return -1;
  const mid = (narrow + wide) / 2;
  const bits = five.map(v => (v > mid ? 1 : 0));
  if (bits[0] + bits[1] + bits[2] + bits[3] + bits[4] !== 2) return -1;
  for (let d = 0; d < 10; d++) if (ITF[d].every((w, i) => w === bits[i])) return d;
  return -1;
}

/* ── Code 128 ─────────────────────────────────────────────────────
   Rarely the retail barcode on food, but it is what store-printed and
   own-brand labels use, so it is worth reading. Payload is validated by
   a mod-103 checksum over every symbol, which is strong enough that a
   misread is far likelier to be rejected than accepted. */
function tryCode128(runs, at) {
  // Quiet zone, same reasoning as EAN.
  if (at === 0) return null;
  const startIdx = bestMatch(runs, at, C128.slice(103, 106), 6);
  if (startIdx < 0) return null;
  const startVal = 103 + startIdx;
  if (runs[at - 1] < (runs[at] + runs[at + 1] + runs[at + 2]) * 0.7) return null;

  const values = [];
  let p = at + 6;
  for (let guard = 0; guard < 80; guard++) {
    if (matches(runs, p, C128_STOP)) break;
    const v = bestMatch(runs, p, C128, 6);
    if (v < 0) return null;
    values.push(v);
    p += 6;
    if (p + 6 > runs.length) return null;
  }
  // data + check, and enough payload that a chance match is implausible
  if (values.length < 5) return null;

  const check = values.pop();
  let sum = startVal;
  for (let i = 0; i < values.length; i++) sum += values[i] * (i + 1);
  if (sum % 103 !== check) return null;

  let mode = startVal, shift = false, out = '';
  for (const v of values) {
    if (mode === 105) {                       // Code C: two digits per symbol
      if (v < 100) { out += String(v).padStart(2, '0'); continue; }
      if (v === 100) mode = 104;
      else if (v === 101) mode = 103;
      continue;
    }
    if (v === 99) { mode = 105; continue; }
    if (v === 100) { if (mode === 103) mode = 104; continue; }
    if (v === 101) { if (mode === 104) mode = 103; continue; }
    if (v === 98) { shift = true; continue; }
    if (v >= 96) continue;                    // FNC1-3, unprintable here
    const m = shift ? (mode === 103 ? 104 : 103) : mode;
    shift = false;
    out += m === 104
      ? String.fromCharCode(v + 32)
      : (v < 64 ? String.fromCharCode(v + 32) : String.fromCharCode(v - 64));
  }
  return out ? { rawValue: out, format: 'code_128' } : null;
}

/* ── Orchestration ──────────────────────────────────────────────── */
function decodeRuns(runs, firstIsDark) {
  for (let i = firstIsDark ? 0 : 1; i + 3 < runs.length; i += 2) {
    if (matches(runs, i, GUARD)) {
      const guardWidth = runs[i] + runs[i + 1] + runs[i + 2];
      if (i > 0 && runs[i - 1] >= guardWidth * 0.8) {
        for (const fmt of EAN_FORMATS) {
          const r = tryEan(runs, i, fmt);
          if (r) return r;
        }
        const e = tryUpcE(runs, i);
        if (e) return e;
      }
    }
    const c = tryCode128(runs, i);
    if (c) return c;
    const f = tryItf(runs, i);
    if (f) return f;
  }
  return null;
}

function decodeLine(line, local) {
  const r = toRuns(line, local);
  if (!r) return null;
  const fwd = decodeRuns(r.runs, r.firstIsDark);
  if (fwd) return fwd;
  const rev = [...r.runs].reverse();
  const revDark = r.runs.length % 2 === 0 ? !r.firstIsDark : r.firstIsDark;
  return decodeRuns(rev, revDark);
}

/**
 * Scan an ImageData for a linear barcode.
 * Sweeps rows *and* columns, so a barcode turned on its side reads just
 * as well as an upright one, and retries with a local threshold when the
 * cheap global one finds nothing.
 */
export function detectInImageData(img, { lines = 17, axes = 'both' } = {}) {
  const { width: w, height: h, data } = img;
  const rowBuf = new Uint8Array(w);
  const colBuf = new Uint8Array(h);

  /* EAN-13 is 95 modules constrained by both a parity word and a check
     digit, and has never produced a false read across the noise suites,
     so one clean line is proof enough. Everything else is shorter or more
     loosely constrained — EAN-8 in particular is 67 modules with no parity
     at all — and must turn up identically on two independent lines before
     we believe it. A real barcode is tall; noise does not repeat itself. */
  const WEAK = { ean_8: 1, upc_e: 1, itf: 1, code_128: 1 };
  let pending = null;
  const accept = hit => {
    if (!hit) return null;
    if (!WEAK[hit.format]) return hit;
    if (pending && pending === hit.rawValue) return hit;
    pending = hit.rawValue;
    return null;
  };

  const sweep = (local) => {
    for (let n = 0; n < lines; n++) {
      // Walk outward from the middle — barcodes are usually near centre,
      // so the earliest lines tried are the likeliest to hit.
      const off = Math.ceil(n / 2) * (n % 2 ? 1 : -1) / (lines + 1);

      if (axes !== 'columns') {
        const y = Math.round(h * (0.5 + off));
        if (y >= 0 && y < h) {
          const row = y * w * 4;
          for (let x = 0; x < w; x++) {
            const i = row + x * 4;
            rowBuf[x] = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
          }
          const hit = accept(decodeLine(rowBuf, local));
          if (hit) return hit;
        }
      }
      if (axes !== 'rows') {
        const x = Math.round(w * (0.5 + off));
        if (x >= 0 && x < w) {
          for (let y = 0; y < h; y++) {
            const i = (y * w + x) * 4;
            colBuf[y] = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
          }
          const hit = accept(decodeLine(colBuf, local));
          if (hit) return hit;
        }
      }
    }
    return null;
  };

  return sweep(false) || sweep(true);
}

/** Grab the current video frame and scan it, near scale then wide. */
export function detectInVideo(video, canvas, { maxWidth = 1080 } = {}) {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) return null;

  const scale = Math.min(1, maxWidth / vw);
  const w = Math.max(2, Math.round(vw * scale));
  const h = Math.max(2, Math.round(vh * scale));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, w, h);

  // Centre band first: it is where a framed barcode is and it is a
  // quarter of the pixels. Only widen to the whole frame if that misses,
  // which is what catches a packet held off to one side.
  const top = Math.round(h * 0.22), band = Math.max(1, Math.round(h * 0.56));
  return detectInImageData(ctx.getImageData(0, top, w, band))
      || detectInImageData(ctx.getImageData(0, 0, w, h), { lines: 11 });
}
