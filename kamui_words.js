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

function isValidLen(s, len, uppercaseOnly = false) {
  if (s.length !== len) return false;
  for (let i = 0; i < len; i++) {
    if (!isCharsetChar(s.charCodeAt(i), uppercaseOnly)) return false;
  }
  return true;
}

function isValidLen12(s, uppercaseOnly = false) {
  return isValidLen(s, 12, uppercaseOnly);
}

function isValidLen11(s, uppercaseOnly = false) {
  return isValidLen(s, 11, uppercaseOnly);
}

function isValidLen14(s, uppercaseOnly = false) {
  return isValidLen(s, 14, uppercaseOnly);
}

function midOffForLen(len) {
  return (len >> 1) & 4;
}

function endOffForLen(len) {
  return len - 4;
}

/** Len 13–24 uses computeKamuiHash12To24 (w0@0, w1@4, w2@8 + tail bytes). */
function isLen12to24(len) {
  return len >= 13 && len <= 24;
}

function wordOffsetsForLen(len) {
  if (isLen12to24(len)) {
    return { w0: 0, w1: 4, w2: 8 };
  }
  return { w0: 0, w1: midOffForLen(len), w2: endOffForLen(len) };
}

/** Bytes after the fixed w0|w1|w2 prefix (indices 12..len-1). */
function tailByteCount(len) {
  return isLen12to24(len) ? len - 12 : 0;
}

function isValidLen12to24(s, len, uppercaseOnly = false) {
  return isValidLen(s, len, uppercaseOnly);
}

/** Assemble len 13–24: w0@0, w1@4, w2@8, tail bytes from index 12. */
function assembleLen12to24(len, w0, w1, w2, tailBytes) {
  const buf = Buffer.alloc(len);
  buf.writeUInt32LE(w0 >>> 0, 0);
  buf.writeUInt32LE(w1 >>> 0, 4);
  buf.writeUInt32LE(w2 >>> 0, 8);
  for (let i = 0; i < tailBytes.length && 12 + i < len; i++) {
    buf[12 + i] = tailBytes[i] & 0xff;
  }
  return buf.toString("ascii", 0, len);
}

/** Assemble 14 bytes: w0@0, w1@4, w2@8, tail bytes 12–13. */
function assembleLen14(w0, w1, w2, b12, b13) {
  return assembleLen12to24(14, w0, w1, w2, [b12, b13]);
}

/**
 * Candidate tail-byte arrays for len 13–24 MITM (bytes at indices 12..len-1).
 * Len 14 defaults to throw/reaction `_n` / `_y` when suffix is not pinned.
 */
function suffixTailVariants(c, len, { deep = false, uppercaseOnly = false } = {}) {
  const charset = uppercaseOnly ? PRINTABLE_UPPER : PRINTABLE;
  const n = tailByteCount(len);
  if (n <= 0) return [[]];

  if (c.suffix && c.suffix.length >= n) {
    const s = c.suffix;
    const tail = [];
    for (let i = 0; i < n; i++) {
      tail.push(s.charCodeAt(s.length - n + i));
    }
    return [tail];
  }

  if (c.suffix && c.suffix.length === 1) {
    const last = c.suffix.charCodeAt(0);
    if (n === 1) return [[last]];
    return [...charset].map((ch) => {
      const out = Array(n).fill(0);
      for (let i = 0; i < n - 1; i++) out[i] = ch.charCodeAt(0);
      out[n - 1] = last;
      return out;
    });
  }

  if (deep) {
    const variants = [];
    function recur(depth, buf) {
      if (depth === n) {
        variants.push([...buf]);
        return;
      }
      for (const ch of charset) {
        buf[depth] = ch.charCodeAt(0);
        recur(depth + 1, buf);
      }
    }
    recur(0, Array(n));
    return variants;
  }

  if (n === 2) return [[0x5f, 0x6e], [0x5f, 0x79]];
  if (n === 1) return [[0x6e], [0x79], [0x5f]];
  return [Array(n).fill(0x5f)];
}

/** @deprecated use suffixTailVariants(c, 14, opts) */
function suffixTailPairs(c, options = {}) {
  return suffixTailVariants(c, 14, options);
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

let _nameKeyStringsCache = null;

function loadNameKeyStrings() {
  if (_nameKeyStringsCache) return _nameKeyStringsCache;
  const strings = [];
  try {
    const nk = require("./name_keys.json");
    for (const v of Object.values(nk)) {
      if (typeof v === "string" && v.length > 0) strings.push(v);
    }
  } catch (_) {}
  _nameKeyStringsCache = strings;
  return strings;
}

function parseMotbinFile(filePath, names) {
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(
      /\d+\s+0x[0-9a-f]+\s+0x[0-9a-f]+\s+\d+\s+\d+\s+(\S+)\s+(\S+)/i
    );
    if (!m) continue;
    if (m[1] !== "-") names.add(m[1]);
    if (m[2] !== "-") names.add(m[2]);
  }
}

function extractFromMotbinLines() {
  const names = new Set();
  const root = __dirname;

  for (const rel of ["output.txt", "output/aml.txt"]) {
    const p = path.join(root, rel);
    if (fs.existsSync(p)) parseMotbinFile(p, names);
  }

  const outDir = path.join(root, "output");
  if (fs.existsSync(outDir)) {
    for (const ent of fs.readdirSync(outDir)) {
      if (!ent.endsWith(".txt")) continue;
      parseMotbinFile(path.join(outDir, ent), names);
    }
  }

  return [...names];
}

/** Tekken reaction / drama prefixes (sDm_harawa40, aDw_vertical, …). */
const REACTION_PREFIXES = [
  "sDm_",
  "aDw_",
  "sGrd_",
  "sDw_",
  "sCo_",
  "sJmp",
  "sRUN",
  "sStg",
  "sPln",
  "It_",
];

function isReactionStylePrefix(prefix) {
  if (!prefix || prefix.length < 3) return false;
  return REACTION_PREFIXES.some((p) => prefix.startsWith(p) || p.startsWith(prefix));
}

/**
 * Bytes 8–11 as two letters + two digits (wa40, 01R, …). ~270k words — small enough for MITM.
 */
function generateReactionTailW2(uppercaseOnly = false) {
  const w2 = new Set();
  const letters = uppercaseOnly
    ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    : "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const buf = Buffer.alloc(4);
  for (const a of letters) {
    for (const b of letters) {
      for (let n = 0; n < 100; n++) {
        const ns = (n < 10 ? "0" : "") + n;
        buf.write(a + b + ns, 0, 4, "ascii");
        w2.add(buf.readUInt32LE(0) >>> 0);
      }
    }
  }
  return w2;
}

/** wMid/wEnd (or w1/w2 at len=12) from name_keys strings sharing the prefix. */
function collectPrefixFragments(prefix, uppercaseOnly = false, strLen = 12) {
  const wMid = new Set();
  const wEnd = new Set();
  if (!prefix) return { wMid, wEnd, w1: wMid, w2: wEnd };

  let nk;
  try {
    nk = require("./name_keys.json");
  } catch {
    return { wMid, wEnd, w1: wMid, w2: wEnd };
  }

  const { w1: midOff, w2: endOff } = wordOffsetsForLen(strLen);

  for (const v of Object.values(nk)) {
    if (typeof v !== "string" || !v.startsWith(prefix)) continue;
    const buf = Buffer.from(v, "latin1");
    if (buf.length >= midOff + 4) {
      const b = bytesFromW(buf.readUInt32LE(midOff));
      if (isPrintableBytes(b, uppercaseOnly)) wMid.add(buf.readUInt32LE(midOff) >>> 0);
    }
    if (buf.length >= endOff + 4) {
      const b = bytesFromW(buf.readUInt32LE(endOff));
      if (isPrintableBytes(b, uppercaseOnly)) wEnd.add(buf.readUInt32LE(endOff) >>> 0);
    }
  }

  return { wMid, wEnd, w1: wMid, w2: wEnd };
}

/** w0/wMid/wEnd from name_keys strings sharing the suffix at the target length. */
function collectSuffixFragments(suffix, uppercaseOnly = false, strLen = 12) {
  const w0 = new Set();
  const wMid = new Set();
  const wEnd = new Set();
  if (!suffix) return { w0, wMid, wEnd };

  const { w0: w0Off, w1: midOff, w2: endOff } = wordOffsetsForLen(strLen);

  for (const v of loadNameKeyStrings()) {
    if (!v.endsWith(suffix) || v.length < strLen) continue;
    const buf = Buffer.from(v, "latin1");
    if (buf.length >= w0Off + 4) {
      const b = bytesFromW(buf.readUInt32LE(w0Off));
      if (isPrintableBytes(b, uppercaseOnly)) w0.add(buf.readUInt32LE(w0Off) >>> 0);
    }
    if (v.length === strLen && buf.length >= midOff + 4) {
      const b = bytesFromW(buf.readUInt32LE(midOff));
      if (isPrintableBytes(b, uppercaseOnly)) wMid.add(buf.readUInt32LE(midOff) >>> 0);
    }
    if (buf.length >= endOff + 4) {
      const b = bytesFromW(buf.readUInt32LE(endOff));
      if (isPrintableBytes(b, uppercaseOnly)) wEnd.add(buf.readUInt32LE(endOff) >>> 0);
    }
  }

  return { w0, wMid, wEnd };
}

/**
 * Compact word pools from prefix/suffix pins + name_keys fragments (no full corpus scan).
 * Used for medium-path lengths when the user supplies prefix and/or suffix.
 */
function buildConstrainedWordSets(c, strLen = 12) {
  const midSlot = isLen12to24(strLen) ? 4 : midOffForLen(strLen);
  const endSlot = isLen12to24(strLen) ? 8 : endOffForLen(strLen);

  const g0 = generateWordsForSlot(0, c, strLen);
  const g1 = generateWordsForSlot(midSlot, c, strLen);
  const g2 = generateWordsForSlot(endSlot, c, strLen);

  let w0 = g0.size > 0 ? g0 : new Set();
  let w1 = g1.size > 0 ? g1 : new Set();
  let w2 = g2.size > 0 ? g2 : new Set();

  if (c.prefix) {
    const fam = collectPrefixFragments(c.prefix, c.uppercaseOnly, strLen);
    w1 = mergeWordSets(w1, fam.wMid);
    w2 = mergeWordSets(w2, fam.wEnd);
  }

  if (c.suffix) {
    const fam = collectSuffixFragments(c.suffix, c.uppercaseOnly, strLen);
    w0 = mergeWordSets(w0, fam.w0);
    w1 = mergeWordSets(w1, fam.wMid);
    w2 = mergeWordSets(w2, fam.wEnd);
  }

  if (c.prefix && isReactionStylePrefix(c.prefix) && strLen === 12) {
    w2 = mergeWordSets(w2, generateReactionTailW2(c.uppercaseOnly));
  }

  return { w0set: w0, w1set: w1, w2set: w2 };
}

const _expandedWordSetsCache = new Map();

/**
 * Expanded 4-byte words from name_keys + motbin (not only len=12 slices).
 */
function buildExpandedWordSets(options = {}) {
  const {
    includeAllW2 = false,
    maxPerBucket = 50000,
    uppercaseOnly = false,
    targetLen = 12,
  } = options;

  const cacheKey = `${targetLen}:${uppercaseOnly ? 1 : 0}:${includeAllW2 ? 1 : 0}:${maxPerBucket}`;
  if (!includeAllW2 && _expandedWordSetsCache.has(cacheKey)) {
    return _expandedWordSetsCache.get(cacheKey);
  }

  const w0 = new Set();
  const w1 = new Set();
  const w2 = new Set();
  const off = wordOffsetsForLen(targetLen);
  const w0Off = off.w0;
  const w1Off = off.w1;
  const w2Off = off.w2;
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
      if (v.length === targetLen) {
        if (i === w0Off) addWord(w, w0);
        if (i === w1Off) addWord(w, w1);
        if (i === w2Off) addWord(w, w2);
      } else if (v.length >= 12) {
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

  const result = {
    w0: trim(w0),
    w1: trim(w1),
    w2: trim(w2),
    all: trim(all),
    pairKeys,
    stringCount: strings.length,
  };

  if (!includeAllW2) _expandedWordSetsCache.set(cacheKey, result);
  return result;
}

/** True when prefix/suffix pins at least one byte in this 4-byte LE slot. */
function slotPinnedByConstraints(c, byteOffset, strLen = 12) {
  for (let i = 0; i < 4; i++) {
    const pos = byteOffset + i;
    if (pos >= strLen) break;
    if (c.prefix && pos < c.prefix.length) return true;
    if (c.suffix && c.suffix.length > 0) {
      const suffixStart = strLen - c.suffix.length;
      if (pos >= suffixStart) return true;
    }
  }
  return false;
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

/** Bytes [byteOffset .. byteOffset+3] must agree with prefix/suffix on the string layout. */
function wordMatchesConstraints(wordAscii, byteOffset, c, strLen = 12) {
  for (let i = 0; i < 4; i++) {
    const pos = byteOffset + i;
    const ch = wordAscii[i];
    if (pos >= strLen) break;
    if (c.prefix && pos < c.prefix.length) {
      if (ch !== c.prefix[pos]) return false;
    }
    if (c.suffix && c.suffix.length > 0) {
      const suffixStart = strLen - c.suffix.length;
      if (pos >= suffixStart && ch !== c.suffix[pos - suffixStart]) return false;
    }
  }
  return true;
}

function filterWordSet(wordSet, byteOffset, c, toAscii = wordToAscii, strLen = 12) {
  if (!c.prefix && !c.suffix) return wordSet;
  const out = new Set();
  for (const w of wordSet) {
    if (wordMatchesConstraints(toAscii(w), byteOffset, c, strLen)) out.add(w);
  }
  return out;
}

/**
 * Enumerate every 4-byte LE word for one slot (0, 4, or 8) consistent with prefix/suffix.
 * e.g. prefix "Pl_" → w0 is Pl_ + one charset char (≤63 words).
 */
function generateWordsForSlot(byteOffset, c, strLen = 12) {
  const charset = c.uppercaseOnly ? PRINTABLE_UPPER : PRINTABLE;
  const words = new Set();
  const fixed = [];
  let hasFixed = false;

  for (let i = 0; i < 4; i++) {
    const pos = byteOffset + i;
    let ch = null;
    if (c.prefix && pos < c.prefix.length) ch = c.prefix[pos];
    if (c.suffix && c.suffix.length > 0) {
      const suffixStart = strLen - c.suffix.length;
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

function applyConstraintsToWordSets(w0set, w1set, w2set, c, strLen = 12) {
  if (!hasConstraints(c)) {
    return { w0set, w1set, w2set, generated: false };
  }

  const midSlot = isLen12to24(strLen) ? 4 : midOffForLen(strLen);
  const endSlot = isLen12to24(strLen) ? 8 : endOffForLen(strLen);

  const g0 = generateWordsForSlot(0, c, strLen);
  const g1 = generateWordsForSlot(midSlot, c, strLen);
  const g2 = generateWordsForSlot(endSlot, c, strLen);

  let w0 = g0.size > 0 ? g0 : filterWordSet(w0set, 0, c, wordToAscii, strLen);
  let w1 = g1.size > 0 ? g1 : filterWordSet(w1set, midSlot, c, wordToAscii, strLen);
  let w2 = g2.size > 0 ? g2 : filterWordSet(w2set, endSlot, c, wordToAscii, strLen);
  if (midSlot === endSlot && g1.size > 0) {
    w2 = mergeWordSets(w2, g1);
  }

  if (c.prefix) {
    const fam = collectPrefixFragments(c.prefix, c.uppercaseOnly, strLen);
    w1 = mergeWordSets(w1, fam.wMid);
    w2 = mergeWordSets(w2, fam.wEnd);
  }

  if (c.suffix) {
    const fam = collectSuffixFragments(c.suffix, c.uppercaseOnly, strLen);
    w0 = mergeWordSets(w0, fam.w0);
    w1 = mergeWordSets(w1, fam.wMid);
    w2 = mergeWordSets(w2, fam.wEnd);
  }

  if (c.prefix && isReactionStylePrefix(c.prefix) && strLen === 12) {
    w2 = mergeWordSets(w2, generateReactionTailW2(c.uppercaseOnly));
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
  isValidLen,
  isValidLen12,
  isValidLen11,
  isValidLen14,
  isValidLen12to24,
  isLen12to24,
  midOffForLen,
  endOffForLen,
  wordOffsetsForLen,
  tailByteCount,
  assembleLen12to24,
  assembleLen14,
  suffixTailVariants,
  suffixTailPairs,
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
  buildConstrainedWordSets,
  isReactionStylePrefix,
  generateReactionTailW2,
  collectPrefixFragments,
  collectSuffixFragments,
  slotPinnedByConstraints,
  REACTION_PREFIXES,
};
