/**
 * Word extraction and w2 completion for Kamui len=12 lookup.
 */
const fs = require("fs");
const path = require("path");

/** Default Tekken animation / motbin name charset (includes lowercase). */
const PRINTABLE =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_";

/** Narrow charset used only for specific analysis targets (e.g. stage IDs). */
const PRINTABLE_UPPER =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";

const PRINTABLE_SET = new Set(PRINTABLE);
const PRINTABLE_UPPER_SET = new Set(PRINTABLE_UPPER);

function isCharsetChar(c, uppercaseOnly = false) {
  const set = uppercaseOnly ? PRINTABLE_UPPER_SET : PRINTABLE_SET;
  return set.has(String.fromCharCode(c));
}

function isValidLen12(s, uppercaseOnly = false) {
  if (s.length !== 12) return false;
  for (let i = 0; i < 12; i++) {
    if (!isCharsetChar(s.charCodeAt(i), uppercaseOnly)) return false;
  }
  return true;
}

function bytesFromW(w) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(w >>> 0, 0);
  return b;
}

function isPrintableBytes(b, uppercaseOnly = false) {
  for (let i = 0; i < 4; i++) {
    if (!isCharsetChar(b[i], uppercaseOnly)) return false;
  }
  return true;
}

function wordToAscii(w) {
  return bytesFromW(w).toString("ascii");
}

let cachedAllW2 = null;

/** All 4-byte words from PRINTABLE (63^4 ≈ 15.7M). */
function getAllPrintableW2(uppercaseOnly = false) {
  if (uppercaseOnly) return getAllPrintableW2Upper();
  if (cachedAllW2) return cachedAllW2;
  const out = [];
  const chars = PRINTABLE;
  const n = chars.length;
  const buf = Buffer.alloc(4);
  for (let i0 = 0; i0 < n; i0++) {
    buf[0] = chars.charCodeAt(i0);
    for (let i1 = 0; i1 < n; i1++) {
      buf[1] = chars.charCodeAt(i1);
      for (let i2 = 0; i2 < n; i2++) {
        buf[2] = chars.charCodeAt(i2);
        for (let i3 = 0; i3 < n; i3++) {
          buf[3] = chars.charCodeAt(i3);
          out.push(buf.readUInt32LE(0));
        }
      }
    }
  }
  cachedAllW2 = out;
  return out;
}

let cachedAllW2Upper = null;

/** 37^4 ≈ 1.87M words — only for --uppercase-only / special-case hashes. */
function getAllPrintableW2Upper() {
  if (cachedAllW2Upper) return cachedAllW2Upper;
  const out = [];
  const chars = PRINTABLE_UPPER;
  const n = chars.length;
  const buf = Buffer.alloc(4);
  for (let i0 = 0; i0 < n; i0++) {
    buf[0] = chars.charCodeAt(i0);
    for (let i1 = 0; i1 < n; i1++) {
      buf[1] = chars.charCodeAt(i1);
      for (let i2 = 0; i2 < n; i2++) {
        buf[2] = chars.charCodeAt(i2);
        for (let i3 = 0; i3 < n; i3++) {
          buf[3] = chars.charCodeAt(i3);
          out.push(buf.readUInt32LE(0));
        }
      }
    }
  }
  cachedAllW2Upper = out;
  return out;
}

function loadNameKeyStrings() {
  const strings = [];
  try {
    const nk = require("./name_keys.json");
    for (const v of Object.values(nk)) {
      if (typeof v === "string" && v.length > 0) strings.push(v);
    }
  } catch (_) {}
  return strings;
}

function extractFromMotbinLines() {
  const names = new Set();
  for (const rel of ["output.txt", "output/aml.txt"]) {
    const p = path.join(__dirname, rel);
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(
        /\d+\s+0x[0-9a-f]+\s+0x[0-9a-f]+\s+\d+\s+\d+\s+(\S+)\s+(\S+)/i
      );
      if (m) {
        if (m[1] !== "-") names.add(m[1]);
        if (m[2] !== "-") names.add(m[2]);
      }
    }
  }
  return [...names];
}

/**
 * Expanded 4-byte words from name_keys + motbin (not only len=12 slices).
 */
function buildExpandedWordSets(options = {}) {
  const { includeAllW2 = false, maxPerBucket = 50000, uppercaseOnly = false } =
    options;

  const w0 = new Set();
  const w1 = new Set();
  const w2 = new Set();
  const all = new Set();
  const pairKeys = new Map(); // "w0|w1" -> count

  const addWord = (w, bucket) => {
    all.add(w);
    if (bucket) bucket.add(w);
  };

  const bumpPair = (a, b) => {
    const k = a + "|" + b;
    pairKeys.set(k, (pairKeys.get(k) || 0) + 1);
  };

  const strings = loadNameKeyStrings();
  for (const rel of ["anim_names.json"]) {
    const p = path.join(__dirname, rel);
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, "utf8");
    const re = /[A-Za-z0-9_]{4,}/g;
    let m;
    while ((m = re.exec(raw))) strings.push(m[0]);
  }
  for (const n of extractFromMotbinLines()) strings.push(n);

  for (const v of strings) {
    if (typeof v !== "string" || v.length < 4) continue;
    const buf = Buffer.from(v, "latin1");
    for (let i = 0; i <= buf.length - 4; i++) {
      const w = buf.readUInt32LE(i);
      const b = bytesFromW(w);
      if (!isPrintableBytes(b, uppercaseOnly)) continue;
      addWord(w, all);
      if (v.length >= 12) {
        if (i === 0) addWord(w, w0);
        if (i === 4) addWord(w, w1);
        if (i === 8 || i === v.length - 4) addWord(w, w2);
      } else {
        if (i === 0) addWord(w, w0);
        if (i === 4 && v.length >= 8) addWord(w, w1);
        if (i === v.length - 4 && v.length >= 8) addWord(w, w2);
      }
      if (i + 8 <= buf.length - 4) {
        const w0v = buf.readUInt32LE(i);
        const w1v = buf.readUInt32LE(i + 4);
        if (
          isPrintableBytes(bytesFromW(w0v), uppercaseOnly) &&
          isPrintableBytes(bytesFromW(w1v), uppercaseOnly)
        ) {
          bumpPair(w0v, w1v);
        }
      }
    }
  }

  if (includeAllW2) {
    for (const w of getAllPrintableW2(uppercaseOnly)) w2.add(w);
  }

  const trim = (set) => {
    if (set.size <= maxPerBucket) return set;
    return new Set([...set].slice(0, maxPerBucket));
  };

  return {
    w0: trim(w0),
    w1: trim(w1),
    w2: trim(w2),
    all: trim(all),
    pairKeys,
    stringCount: strings.length,
  };
}

/** Top (w0,w1) pairs that co-occur in name_keys sliding windows. */
function topPairs(pairKeys, limit) {
  return [...pairKeys.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => {
      const [a, b] = k.split("|");
      return [Number(a) >>> 0, Number(b) >>> 0];
    });
}

/**
 * User-known fragments of the 12-char string (prefix / suffix / substring).
 */
function normalizeConstraints(opts = {}) {
  return {
    prefix: opts.prefix ? String(opts.prefix) : "",
    suffix: opts.suffix ? String(opts.suffix) : "",
    contains: opts.contains ? String(opts.contains) : "",
    uppercaseOnly: !!opts.uppercaseOnly,
  };
}

function hasConstraints(c) {
  return !!(c.prefix || c.suffix || c.contains);
}

function matchesConstraints(s, c) {
  if (c.prefix && !s.startsWith(c.prefix)) return false;
  if (c.suffix && !s.endsWith(c.suffix)) return false;
  if (c.contains && !s.includes(c.contains)) return false;
  return true;
}

/** Bytes [byteOffset .. byteOffset+3] must agree with prefix/suffix on the full 12-char layout. */
function wordMatchesConstraints(wordAscii, byteOffset, c) {
  for (let i = 0; i < 4; i++) {
    const pos = byteOffset + i;
    const ch = wordAscii[i];
    if (pos >= 12) break;
    if (c.prefix && pos < c.prefix.length) {
      if (ch !== c.prefix[pos]) return false;
    }
    if (c.suffix && c.suffix.length > 0) {
      const suffixStart = 12 - c.suffix.length;
      if (pos >= suffixStart && ch !== c.suffix[pos - suffixStart]) return false;
    }
  }
  return true;
}

function filterWordSet(wordSet, byteOffset, c, toAscii = wordToAscii) {
  if (!c.prefix && !c.suffix) return wordSet;
  const out = new Set();
  for (const w of wordSet) {
    if (wordMatchesConstraints(toAscii(w), byteOffset, c)) out.add(w);
  }
  return out;
}

/**
 * Enumerate every 4-byte LE word for one slot (0, 4, or 8) consistent with prefix/suffix.
 * e.g. prefix "Pl_" → w0 is Pl_ + one charset char (≤63 words).
 */
function generateWordsForSlot(byteOffset, c) {
  const charset = c.uppercaseOnly ? PRINTABLE_UPPER : PRINTABLE;
  const words = new Set();
  const fixed = [];
  let hasFixed = false;

  for (let i = 0; i < 4; i++) {
    const pos = byteOffset + i;
    let ch = null;
    if (c.prefix && pos < c.prefix.length) ch = c.prefix[pos];
    if (c.suffix && c.suffix.length > 0) {
      const suffixStart = 12 - c.suffix.length;
      if (pos >= suffixStart) ch = c.suffix[pos - suffixStart];
    }
    if (ch != null) hasFixed = true;
    fixed.push(ch);
  }

  if (!hasFixed) return words;

  function recur(i, buf) {
    if (i === 4) {
      words.add(buf.readUInt32LE(0));
      return;
    }
    const choices = fixed[i] !== null ? [fixed[i]] : [...charset];
    for (const ch of choices) {
      buf[i] = ch.charCodeAt(0);
      recur(i + 1, buf);
    }
  }

  const buf = Buffer.alloc(4);
  recur(0, buf);
  return words;
}

function applyConstraintsToWordSets(w0set, w1set, w2set, c) {
  if (!hasConstraints(c)) {
    return { w0set, w1set, w2set, generated: false };
  }

  let w0 = filterWordSet(w0set, 0, c);
  let w1 = filterWordSet(w1set, 4, c);
  let w2 = filterWordSet(w2set, 8, c);

  if (c.prefix || c.suffix) {
    const g0 = generateWordsForSlot(0, c);
    const g1 = generateWordsForSlot(4, c);
    const g2 = generateWordsForSlot(8, c);
    w0 = mergeWordSets(w0, g0);
    w1 = mergeWordSets(w1, g1);
    w2 = mergeWordSets(w2, g2);
  }

  return { w0set: w0, w1set: w1, w2set: w2, generated: true };
}

function mergeWordSets(a, b) {
  const out = new Set(a);
  for (const w of b) out.add(w);
  return out;
}

module.exports = {
  PRINTABLE,
  PRINTABLE_UPPER,
  isValidLen12,
  isPrintableBytes,
  wordToAscii,
  getAllPrintableW2,
  getAllPrintableW2Upper,
  buildExpandedWordSets,
  topPairs,
  extractFromMotbinLines,
  normalizeConstraints,
  hasConstraints,
  matchesConstraints,
  filterWordSet,
  generateWordsForSlot,
  applyConstraintsToWordSets,
};
