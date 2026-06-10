/**
 * Kamui len=12 recovery: MITM + optional w2 completion.
 * Default charset: A-Za-z0-9_ (63 chars). Use uppercaseOnly for A-Z0-9_ (37 chars).
 */
const fs = require("fs");
const path = require("path");
const { computeKamuiHash } = require("./hash");
const {
  invFinalToV,
  hFromW0W2,
  hFromW0End,
  kMidFromW1,
  kMidFromWord,
  wMidFromKMid,
  solveW0Medium,
  solveWMidMedium,
  solveWEndMedium,
  hXorKmidFromV,
  mediumLayout,
  chainH2FromWords,
  chainH2FromWordsLen,
  k1FromWordsTail,
  k1FromTailLen,
  k1FromW2Tail,
  needMatchesTarget,
  needsFromTarget14,
  invStepA,
  k2FromW0,
  s4FromW0Byte3W1W2,
} = require("./kamui_analyze");
const {
  wordToAscii,
  buildExpandedWordSets,
  topPairs,
  getAllPrintableW2,
  isValidLen,
  isValidLen12,
  isValidLen11,
  isValidLen14,
  isValidLen12to24,
  isLen12to24,
  assembleLen12to24,
  assembleLen14,
  suffixTailVariants,
  suffixTailPairs,
  normalizeConstraints,
  hasConstraints,
  matchesConstraints,
  applyConstraintsToWordSets,
  buildConstrainedWordSets,
  generateWordsForSlot,
  endOffForLen,
  slotPinnedByConstraints,
  PRINTABLE,
  PRINTABLE_UPPER,
} = require("./kamui_words");

function bytesFromW(w) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(w >>> 0, 0);
  return b;
}

const LEN_11 = 11;
const LEN_12 = 12;
const LEN_13 = 13;
const LEN_14 = 14;
const LEN_12TO24_MIN = 13;
const LEN_12TO24_MAX = 24;
const MEDIUM_LEN_MIN = 5;
const MEDIUM_LEN_MAX = 12;

function isMediumLen(len) {
  return len >= MEDIUM_LEN_MIN && len <= MEDIUM_LEN_MAX;
}

function assembleStringMedium(len, wStart, wMid, wEnd) {
  const { endOff, midSameAsStart, midSameAsEnd, midOff } = mediumLayout(len);
  const buf = Buffer.alloc(Math.max(len, endOff + 4));
  buf.writeUInt32LE(wStart >>> 0, 0);
  if (!midSameAsStart) buf.writeUInt32LE(wMid >>> 0, midOff);
  if (!midSameAsEnd) buf.writeUInt32LE(wEnd >>> 0, endOff);
  return buf.toString("ascii", 0, len);
}

function wordsLinkedMedium(len, wStart, wMid, wEnd) {
  const { midSameAsStart, midSameAsEnd, links } = mediumLayout(len);
  if (midSameAsStart && (wMid >>> 0) !== (wStart >>> 0)) return false;
  if (midSameAsEnd && (wMid >>> 0) !== (wEnd >>> 0)) return false;
  const bMid = bytesFromW(wMid);
  const bEnd = bytesFromW(wEnd);
  for (const { midByte, endByte } of links) {
    if (bMid[midByte] !== bEnd[endByte]) return false;
  }
  return true;
}

function isValidMedium(s, len, uppercaseOnly = false) {
  return isValidLen(s, len, uppercaseOnly);
}

function assembleString(w0, w1, w2) {
  const buf = Buffer.alloc(12);
  buf.writeUInt32LE(w0 >>> 0, 0);
  buf.writeUInt32LE(w1 >>> 0, 4);
  buf.writeUInt32LE(w2 >>> 0, 8);
  return buf.toString("ascii");
}

/** len=11: w0 @0, wMid @4, wEnd @7 (byte 7 is shared between mid/end). */
function assembleStringLen11(w0, wMid, wEnd) {
  const buf = Buffer.alloc(11);
  buf.writeUInt32LE(w0 >>> 0, 0);
  buf.writeUInt32LE(wMid >>> 0, 4);
  buf.writeUInt32LE(wEnd >>> 0, 7);
  return buf.toString("ascii", 0, 11);
}

function linkedByte7(wMid, wEnd) {
  return bytesFromW(wMid)[3] === bytesFromW(wEnd)[0];
}

function loadCorpus(len = LEN_12) {
  const corpus = new Set();
  const add = (s) => {
    if (typeof s === "string" && s.length === len) corpus.add(s);
  };

  try {
    const nk = require("./name_keys.json");
    for (const v of Object.values(nk)) add(v);
  } catch (_) {}

  for (const f of ["anim_names.json"]) {
    const p = path.join(__dirname, f);
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, "utf8");
    const re = new RegExp(`[A-Za-z0-9_]{${len}}`, "g");
    let m;
    while ((m = re.exec(raw))) add(m[0]);
  }

  const outRe = new RegExp(`\\b([A-Za-z0-9_]{${len}})\\b`, "g");
  for (const rel of ["output.txt", "output/aml.txt"]) {
    const p = path.join(__dirname, rel);
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, "utf8");
    let m;
    while ((m = outRe.exec(raw))) add(m[1]);
  }

  const outDir = path.join(__dirname, "output");
  if (fs.existsSync(outDir)) {
    for (const ent of fs.readdirSync(outDir)) {
      if (!ent.endsWith(".txt")) continue;
      const raw = fs.readFileSync(path.join(outDir, ent), "utf8");
      let m;
      while ((m = outRe.exec(raw))) add(m[1]);
    }
  }

  return [...corpus];
}

/** Scan corpus for exact strings of given length matching target hash. */
function corpusScanLen12to24(targetHash, len, uppercaseOnly = false) {
  const hits = [];
  for (const s of loadCorpus(len)) {
    if (!isValidLen12to24(s, len, uppercaseOnly)) continue;
    if (computeKamuiHash(s) !== targetHash) continue;
    hits.push({ s, w0: "", w1: "", w2: "", source: `corpus-${len}` });
  }
  return hits;
}

function corpusScanLen14(targetHash, uppercaseOnly = false) {
  return corpusScanLen12to24(targetHash, LEN_14, uppercaseOnly);
}

function generateFormatWords() {
  const w0 = new Set();
  const w1 = new Set();
  const w2 = new Set();

  const mid4 = [
    "_at_", "_co_", "_th_", "_un_", "_dm_", "_gd_", "_ss_", "_to_",
    "_oz_", "_kz_", "_yt_", "_pl_", "_ko_", "_na_", "_kw_", "_mn_",
  ];
  const pre4 = [
    "aml", "amly", "amlt", "amlp", "cmn", "com", "tcm", "bcn", "zcm",
    "grf", "jnk", "kal", "okm", "Wcm", "Tcm", "Mcm", "Hcm", "Bcm", "Ycm",
  ];

  for (const p of pre4) {
    const buf = Buffer.alloc(4);
    buf.write((p + "___").slice(0, 4), 0, 4, "ascii");
    w0.add(buf.readUInt32LE(0));
  }
  for (const m of mid4) {
    const buf = Buffer.alloc(4);
    buf.write(m, 0, 4, "ascii");
    w1.add(buf.readUInt32LE(0));
  }
  for (const tail of ["JI55", "FI55", "IJ55", "55", "00", "01", "571"]) {
    const buf = Buffer.alloc(4);
    buf.write((tail + "____").slice(0, 4), 0, 4, "ascii");
    w2.add(buf.readUInt32LE(0));
  }
  for (const pre of ["_CH2", "CH20", "0_FI", "O_FI", "_FIJ", "JI55"]) {
    const buf = Buffer.alloc(4);
    buf.write((pre + "____").slice(0, 4), 0, 4, "ascii");
    w0.add(buf.readUInt32LE(0));
    w1.add(buf.readUInt32LE(0));
    w2.add(buf.readUInt32LE(0));
  }

  return { w0, w1, w2 };
}

function mergeSets(base, extra) {
  const out = new Set(base);
  for (const w of extra) out.add(w);
  return out;
}

/**
 * Memory-safe MITM: per w0 build h→[w2] (cap list size), match all w1.
 */
function mitmSolve(hx, w0set, w1set, w2set, targetHash, bucketCap = 8, uppercaseOnly = false) {
  const hits = new Map(); // string -> hit meta
  const w0arr = [...w0set];
  const w1arr = [...w1set];
  const w2arr = [...w2set];

  for (const w0 of w0arr) {
    const hToW2 = new Map();
    for (const w2 of w2arr) {
      const hv = hFromW0W2(w0, w2) >>> 0;
      let list = hToW2.get(hv);
      if (!list) {
        list = [];
        hToW2.set(hv, list);
      }
      if (list.length < bucketCap) list.push(w2);
    }

    for (const w1 of w1arr) {
      const need = (hx ^ kMidFromW1(w1)) >>> 0;
      const w2list = hToW2.get(need);
      if (!w2list) continue;
      for (const w2 of w2list) {
        const s = assembleString(w0, w1, w2);
        if (!isValidLen12(s, uppercaseOnly)) continue;
        if (computeKamuiHash(s) !== targetHash) continue;
        if (!hits.has(s)) {
          hits.set(s, {
            s,
            w0: wordToAscii(w0),
            w1: wordToAscii(w1),
            w2: wordToAscii(w2),
            source: "mitm",
          });
        }
      }
    }
  }

  return [...hits.values()];
}

/**
 * For each w0 (capped), scan all printable w2 — inverted loop avoids a 15M-entry Map.
 */
function deepW2Solve(hx, w0set, w1set, targetHash, { maxW0 = 80, uppercaseOnly = false } = {}) {
  const hits = new Map();
  const w0arr = [...w0set].slice(0, maxW0);
  const w1arr = [...w1set];
  const allW2 = getAllPrintableW2(uppercaseOnly);

  for (const w0 of w0arr) {
    const needToW1 = new Map();
    for (const w1 of w1arr) {
      needToW1.set((hx ^ kMidFromW1(w1)) >>> 0, w1);
    }

    for (const w2 of allW2) {
      const w1 = needToW1.get(hFromW0W2(w0, w2) >>> 0);
      if (w1 === undefined) continue;
      const s = assembleString(w0, w1, w2);
      if (!isValidLen12(s, uppercaseOnly)) continue;
      if (computeKamuiHash(s) !== targetHash) continue;
      if (!hits.has(s)) {
        hits.set(s, {
          s,
          w0: wordToAscii(w0),
          w1: wordToAscii(w1),
          w2: wordToAscii(w2),
          source: "deep-w2",
        });
      }
    }
  }
  return [...hits.values()];
}

/**
 * For frequent (w0,w1) pairs from corpus, brute all printable w2 only.
 */
function pairW2Solve(hx, pairKeys, targetHash, { maxPairs = 400, uppercaseOnly = false } = {}) {
  const hits = new Map();
  const pairs = topPairs(pairKeys, maxPairs);
  const allW2 = getAllPrintableW2(uppercaseOnly);

  for (const [w0, w1] of pairs) {
    const need = (hx ^ kMidFromW1(w1)) >>> 0;
    for (const w2 of allW2) {
      if (hFromW0W2(w0, w2) !== need) continue;
      const s = assembleString(w0, w1, w2);
      if (!isValidLen12(s, uppercaseOnly)) continue;
      if (computeKamuiHash(s) !== targetHash) continue;
      if (!hits.has(s)) {
        hits.set(s, {
          s,
          w0: wordToAscii(w0),
          w1: wordToAscii(w1),
          w2: wordToAscii(w2),
          source: "pair-w2",
        });
      }
    }
  }
  return [...hits.values()];
}

/**
 * Medium-path MITM for lengths 5–12 (k_start / k_mid / k_end layout).
 */
function mitmSolveMedium(
  hx,
  len,
  wStartSet,
  wMidSet,
  wEndSet,
  targetHash,
  bucketCap = 8,
  uppercaseOnly = false
) {
  const hits = new Map();
  const layout = mediumLayout(len);
  const wStartArr = [...wStartSet];
  const wMidArr = [...wMidSet];
  const wEndArr = [...wEndSet];

  const record = (wStart, wMid, wEnd, source) => {
    if (!wordsLinkedMedium(len, wStart, wMid, wEnd)) return;
    const s = assembleStringMedium(len, wStart, wMid, wEnd);
    if (!isValidMedium(s, len, uppercaseOnly)) return;
    if (computeKamuiHash(s) !== targetHash) return;
    if (!hits.has(s)) {
      hits.set(s, {
        s,
        w0: wordToAscii(wStart),
        w1: wordToAscii(wMid),
        w2: wordToAscii(wEnd),
        source,
      });
    }
  };

  if (layout.midSameAsStart) {
    for (const wStart of wStartArr) {
      const wMid = wStart;
      const need = (hx ^ kMidFromWord(wMid)) >>> 0;
      for (const wEnd of wEndArr) {
        if (hFromW0End(wStart, wEnd, len) !== need) continue;
        record(wStart, wMid, wEnd, `mitm-len${len}`);
      }
    }
    return [...hits.values()];
  }

  if (layout.midSameAsEnd) {
    for (const wStart of wStartArr) {
      for (const wTail of wMidArr) {
        const wMid = wTail;
        const wEnd = wTail;
        const need = (hx ^ kMidFromWord(wMid)) >>> 0;
        if (hFromW0End(wStart, wEnd, len) !== need) continue;
        record(wStart, wMid, wEnd, `mitm-len${len}`);
      }
    }
    return [...hits.values()];
  }

  // Linked layout (len 5–11): kMid is a bijection — recover wMid from each (wStart, wEnd).
  if (layout.links.length > 0) {
    for (const wStart of wStartArr) {
      for (const wEnd of wEndArr) {
        const h2 = hFromW0End(wStart, wEnd, len) >>> 0;
        const wMid = wMidFromKMid((hx ^ h2) >>> 0);
        record(wStart, wMid, wEnd, `analytic-mid-len${len}`);
      }
    }
    return [...hits.values()];
  }

  for (const wStart of wStartArr) {
    const hToEnd = new Map();
    for (const wEnd of wEndArr) {
      const h2 = hFromW0End(wStart, wEnd, len) >>> 0;
      let list = hToEnd.get(h2);
      if (!list) {
        list = [];
        hToEnd.set(h2, list);
      }
      if (list.length < bucketCap) list.push(wEnd);
    }

    for (const wMid of wMidArr) {
      const need = (hx ^ kMidFromWord(wMid)) >>> 0;
      const endList = hToEnd.get(need);
      if (!endList) continue;
      for (const wEnd of endList) {
        record(wStart, wMid, wEnd, `mitm-len${len}`);
      }
    }
  }

  return [...hits.values()];
}

function deepEndSolveMedium(
  hx,
  len,
  wStartSet,
  wMidSet,
  targetHash,
  { maxW0 = 80, uppercaseOnly = false } = {}
) {
  const hits = new Map();
  const layout = mediumLayout(len);
  const wStartArr = [...wStartSet].slice(0, maxW0);
  const wMidArr = [...wMidSet];
  const allEnd = getAllPrintableW2(uppercaseOnly);

  const record = (wStart, wMid, wEnd, source) => {
    if (!wordsLinkedMedium(len, wStart, wMid, wEnd)) return;
    const s = assembleStringMedium(len, wStart, wMid, wEnd);
    if (!isValidMedium(s, len, uppercaseOnly)) return;
    if (computeKamuiHash(s) !== targetHash) return;
    if (!hits.has(s)) {
      hits.set(s, {
        s,
        w0: wordToAscii(wStart),
        w1: wordToAscii(wMid),
        w2: wordToAscii(wEnd),
        source,
      });
    }
  };

  if (layout.midSameAsStart) {
    for (const wStart of wStartArr) {
      const wMid = wStart;
      const need = (hx ^ kMidFromWord(wMid)) >>> 0;
      for (const wEnd of allEnd) {
        if (hFromW0End(wStart, wEnd, len) !== need) continue;
        record(wStart, wMid, wEnd, `deep-end-len${len}`);
      }
    }
    return [...hits.values()];
  }

  if (layout.midSameAsEnd) {
    for (const wStart of wStartArr) {
      for (const wTail of allEnd) {
        const wMid = wTail;
        const wEnd = wTail;
        const need = (hx ^ kMidFromWord(wMid)) >>> 0;
        if (hFromW0End(wStart, wEnd, len) !== need) continue;
        record(wStart, wMid, wEnd, `deep-end-len${len}`);
      }
    }
    return [...hits.values()];
  }

  for (const wStart of wStartArr) {
    const needToMid = new Map();
    for (const wMid of wMidArr) {
      needToMid.set((hx ^ kMidFromWord(wMid)) >>> 0, wMid);
    }

    for (const wEnd of allEnd) {
      const h2 = hFromW0End(wStart, wEnd, len) >>> 0;
      const wMid = needToMid.get(h2);
      if (wMid === undefined) continue;
      record(wStart, wMid, wEnd, `deep-end-len${len}`);
    }
  }

  return [...hits.values()];
}

const COMPLETE_DEFAULT_MAX_ITER = 200_000_000;

/** Byte positions [lo..hi] (inclusive) of the three medium-path word reads. */
function mediumWordRanges(len) {
  const midOff = (len >> 1) & 4;
  return {
    w0: [0, 3],
    wMid: [midOff, midOff + 3],
    wEnd: [len - 4, len - 1],
    midOff,
  };
}

function unionPositions(rangeA, rangeB) {
  const set = new Set();
  for (let p = rangeA[0]; p <= rangeA[1]; p++) set.add(p);
  for (let p = rangeB[0]; p <= rangeB[1]; p++) set.add(p);
  return [...set].sort((a, b) => a - b);
}

/**
 * Complete medium-path (len 5–12) preimage generator — no brute force, no corpus.
 *
 * The small-input hash reads exactly three 32-bit words (w0, wMid, wEnd) and every
 * stage is invertible, so any one word is uniquely determined by the other two.
 * We enumerate the free bytes of the two cheapest words over the full charset and
 * solve the third analytically, then verify by re-hashing the assembled string.
 * This finds every valid string consistent with the prefix/suffix constraints,
 * as long as the enumeration stays within `maxIter`.
 */
function solveMediumComplete(targetHash, len, constraints, opts = {}) {
  const { uppercaseOnly = false, maxIter = COMPLETE_DEFAULT_MAX_ITER } = opts;
  const charset = uppercaseOnly ? PRINTABLE_UPPER : PRINTABLE;
  const codes = [...charset].map((c) => c.charCodeAt(0));

  const vList = invFinalToV(targetHash);
  if (vList.length === 0) {
    return { error: "Could not invert fmix (wrong path or hash?)", hits: [] };
  }

  const pin = new Array(len).fill(null);
  if (constraints.prefix) {
    for (let i = 0; i < constraints.prefix.length && i < len; i++) {
      pin[i] = constraints.prefix.charCodeAt(i);
    }
  }
  if (constraints.suffix) {
    const s = constraints.suffix;
    for (let i = 0; i < s.length && i < len; i++) {
      pin[len - s.length + i] = s.charCodeAt(i);
    }
  }

  const ranges = mediumWordRanges(len);
  const choices = [
    { derive: "w0", enumPos: unionPositions(ranges.wMid, ranges.wEnd) },
    { derive: "wMid", enumPos: unionPositions(ranges.w0, ranges.wEnd) },
    { derive: "wEnd", enumPos: unionPositions(ranges.w0, ranges.wMid) },
  ];
  for (const ch of choices) {
    ch.freePos = ch.enumPos.filter((p) => pin[p] === null);
    ch.cost = Math.pow(codes.length, ch.freePos.length);
  }
  choices.sort((a, b) => a.cost - b.cost);
  const best = choices[0];

  if (best.cost > maxIter) {
    return {
      hits: [],
      exhaustive: false,
      cost: best.cost,
      derive: best.derive,
      freeBytes: best.freePos.length,
    };
  }

  const readWord = (bytes, off) =>
    ((bytes[off] |
      (bytes[off + 1] << 8) |
      (bytes[off + 2] << 16) |
      (bytes[off + 3] << 24)) >>>
      0);

  const inCharset = new Array(256).fill(false);
  for (const c of codes) inCharset[c] = true;
  const wordBytesValid = (w) =>
    inCharset[w & 0xff] &&
    inCharset[(w >>> 8) & 0xff] &&
    inCharset[(w >>> 16) & 0xff] &&
    inCharset[(w >>> 24) & 0xff];

  const hits = new Map();
  const bytes = new Array(len).fill(0);
  for (let i = 0; i < len; i++) if (pin[i] !== null) bytes[i] = pin[i];

  const free = best.freePos;
  const deriveOff =
    best.derive === "w0"
      ? ranges.w0[0]
      : best.derive === "wMid"
        ? ranges.midOff
        : ranges.wEnd[0];

  for (const v of vList) {
    const hx = hXorKmidFromV(v);

    // Odometer over the free enumerated positions.
    const idx = new Array(free.length).fill(0);
    for (let i = 0; i < free.length; i++) bytes[free[i]] = codes[0];

    while (true) {
      const w0r = readWord(bytes, ranges.w0[0]);
      const wMidr = readWord(bytes, ranges.midOff);
      const wEndr = readWord(bytes, ranges.wEnd[0]);

      let derived;
      if (best.derive === "w0") derived = solveW0Medium(hx, wMidr, wEndr, len);
      else if (best.derive === "wMid")
        derived = solveWMidMedium(hx, w0r, wEndr, len);
      else derived = solveWEndMedium(hx, w0r, wMidr, len);

      if (wordBytesValid(derived)) {
        const saved = [
          bytes[deriveOff],
          bytes[deriveOff + 1],
          bytes[deriveOff + 2],
          bytes[deriveOff + 3],
        ];
        bytes[deriveOff] = derived & 0xff;
        bytes[deriveOff + 1] = (derived >>> 8) & 0xff;
        bytes[deriveOff + 2] = (derived >>> 16) & 0xff;
        bytes[deriveOff + 3] = (derived >>> 24) & 0xff;

        let ok = true;
        for (let i = 0; i < len; i++) {
          if (!inCharset[bytes[i]]) {
            ok = false;
            break;
          }
          if (pin[i] !== null && bytes[i] !== pin[i]) {
            ok = false;
            break;
          }
        }
        if (ok) {
          const s = String.fromCharCode(...bytes.slice(0, len));
          if ((computeKamuiHash(s) >>> 0) === (targetHash >>> 0) && !hits.has(s)) {
            hits.set(s, {
              s,
              w0: wordToAscii(readWord(bytes, ranges.w0[0])),
              w1: wordToAscii(readWord(bytes, ranges.midOff)),
              w2: wordToAscii(readWord(bytes, ranges.wEnd[0])),
              source: `complete-len${len}`,
            });
          }
        }

        bytes[deriveOff] = saved[0];
        bytes[deriveOff + 1] = saved[1];
        bytes[deriveOff + 2] = saved[2];
        bytes[deriveOff + 3] = saved[3];
      }

      // Advance odometer.
      let k = free.length - 1;
      while (k >= 0) {
        idx[k]++;
        if (idx[k] < codes.length) {
          bytes[free[k]] = codes[idx[k]];
          break;
        }
        idx[k] = 0;
        bytes[free[k]] = codes[0];
        k--;
      }
      if (k < 0) break;
    }
  }

  return {
    hits: [...hits.values()],
    exhaustive: true,
    cost: best.cost,
    derive: best.derive,
    freeBytes: free.length,
  };
}

function solveTargetMedium(targetHash, len, opts = {}) {
  if (!isMediumLen(len)) {
    return { error: `solveTargetMedium: length must be 5–12, got ${len}` };
  }

  const {
    formatFallback = false,
    deep = false,
    pairW2 = false,
    maxW0Deep = 80,
    maxPairs = 400,
    bucketCap = 16,
    uppercaseOnly = false,
    constraints: rawConstraints = {},
  } = opts;

  const constraints = normalizeConstraints({
    ...rawConstraints,
    uppercaseOnly,
  });

  const vList = invFinalToV(targetHash);
  if (vList.length === 0) return { error: "Could not invert fmix (wrong path or hash?)" };

  // Complete analytic generator: enumerate the two cheapest words over the full
  // charset and solve the third. When feasible it is exhaustive — it cannot miss.
  let incompleteNote = null;
  if (constraints.prefix || constraints.suffix) {
    const complete = solveMediumComplete(targetHash, len, constraints, {
      uppercaseOnly,
      maxIter: opts.maxIter,
    });
    if (!complete.error && complete.exhaustive) {
      return {
        hx: null,
        v: vList.length === 1 ? vList[0] : null,
        hits: complete.hits,
        constraints,
        exhaustive: true,
        wordCounts: {
          w0: 0,
          w1: 0,
          w2: 0,
          strings: 0,
          complete: true,
          derive: complete.derive,
          freeBytes: complete.freeBytes,
        },
      };
    }
    if (!complete.error) {
      // Too large to fully enumerate at the current cap — corpus-assisted below.
      incompleteNote = {
        freeBytes: complete.freeBytes,
        cost: complete.cost,
      };
    }
  }

  if (vList.length > 1) return { error: "Ambiguous fmix preimage", vList };

  const hx = hXorKmidFromV(vList[0]);
  const useConstraintPools =
    hasConstraints(constraints) &&
    !!(constraints.prefix || constraints.suffix);

  let wStartSet;
  let wMidSet;
  let wEndSet;
  let stringCount = 0;
  let pairKeys = null;

  if (useConstraintPools) {
    const slots = buildConstrainedWordSets(constraints, len);
    wStartSet = slots.w0set;
    wMidSet = slots.w1set;
    wEndSet = slots.w2set;

    const layout = mediumLayout(len);
    if (layout.links.length > 0) {
      const endSlot = endOffForLen(len);
      const gEnd = generateWordsForSlot(endSlot, constraints, len);
      if (gEnd.size > 0) wEndSet = gEnd;

      if (
        !slotPinnedByConstraints(constraints, 0, len) &&
        !constraints.prefix
      ) {
        const expanded = buildExpandedWordSets({
          includeAllW2: false,
          uppercaseOnly,
          targetLen: len,
        });
        stringCount = expanded.stringCount;
        wStartSet = mergeSets(wStartSet, expanded.w0);
      }

      wMidSet = new Set();
    }
  } else {
    const expanded = buildExpandedWordSets({
      includeAllW2: false,
      uppercaseOnly,
      targetLen: len,
    });
    stringCount = expanded.stringCount;
    pairKeys = expanded.pairKeys;
    const fmt = len === LEN_12 ? generateFormatWords() : null;

    wStartSet = expanded.w0;
    wMidSet = expanded.w1;
    wEndSet = expanded.w2;

    if (formatFallback && fmt) {
      wStartSet = mergeSets(wStartSet, fmt.w0);
      wMidSet = mergeSets(wMidSet, fmt.w1);
      wEndSet = mergeSets(wEndSet, fmt.w2);
    }

    const applied = applyConstraintsToWordSets(
      wStartSet,
      wMidSet,
      wEndSet,
      constraints,
      len
    );
    wStartSet = applied.w0set;
    wMidSet = applied.w1set;
    wEndSet = applied.w2set;
  }

  const hitMap = new Map();
  const addHits = (list, sourceOverride) => {
    for (const h of list) {
      const key = h.s;
      if (!hitMap.has(key)) {
        hitMap.set(key, { ...h, source: sourceOverride || h.source });
      }
    }
  };

  addHits(
    mitmSolveMedium(
      hx,
      len,
      wStartSet,
      wMidSet,
      wEndSet,
      targetHash,
      bucketCap,
      uppercaseOnly
    ),
    `mitm-len${len}`
  );

  // Len 11 deep scans all printable wEnd (~63^4); use constraint MITM instead.
  if (deep && len !== LEN_11) {
    const deepW0Limit =
      constraints.prefix && wStartSet.size <= 128 ? wStartSet.size : maxW0Deep;
    addHits(
      deepEndSolveMedium(hx, len, wStartSet, wMidSet, targetHash, {
        maxW0: deepW0Limit,
        uppercaseOnly,
      }),
      `deep-end-len${len}`
    );
  }

  if (pairW2 && len === LEN_12 && pairKeys) {
    addHits(
      pairW2Solve(hx, pairKeys, targetHash, { maxPairs, uppercaseOnly }),
      "pair-w2"
    );
  }

  let hits = [...hitMap.values()];
  if (hasConstraints(constraints)) {
    hits = hits.filter((h) => matchesConstraints(h.s, constraints));
  }

  return {
    hx: hx >>> 0,
    v: vList[0],
    hits,
    constraints,
    exhaustive: incompleteNote ? false : undefined,
    incompleteNote,
    wordCounts: {
      w0: wStartSet.size,
      w1: wMidSet.size,
      w2: wEndSet.size,
      strings: stringCount,
      constraintPools: useConstraintPools,
    },
  };
}

function solveTargetLen11(targetHash, opts = {}) {
  return solveTargetMedium(targetHash, LEN_11, opts);
}

/**
 * Len 13–24 MITM via need = h2^k1 (h2 independent of tail bytes from k1 offset).
 */
function mitmSolveLen12to24(
  len,
  w0set,
  w1set,
  w2set,
  targetHash,
  tailVariants,
  _bucketCap = 8,
  uppercaseOnly = false
) {
  const hits = new Map();
  const w0arr = [...w0set];
  const w1arr = [...w1set];
  const w2arr = [...w2set];

  for (const w0 of w0arr) {
    for (const w1 of w1arr) {
      for (const w2 of w2arr) {
        const h2 = chainH2FromWordsLen(len, w0, w1, w2);
        for (const tail of tailVariants) {
          const k1 = k1FromTailLen(len, w2, tail);
          const need = (h2 ^ k1) >>> 0;
          if (!needMatchesTarget(need, targetHash)) continue;
          const s = assembleLen12to24(len, w0, w1, w2, tail);
          if (!isValidLen12to24(s, len, uppercaseOnly)) continue;
          if (computeKamuiHash(s) !== targetHash) continue;
          if (!hits.has(s)) {
            hits.set(s, {
              s,
              w0: wordToAscii(w0),
              w1: wordToAscii(w1),
              w2: wordToAscii(w2),
              source: `mitm-len${len}`,
            });
          }
        }
      }
    }
  }

  return [...hits.values()];
}

function mitmSolveLen14(...args) {
  return mitmSolveLen12to24(LEN_14, ...args);
}

/**
 * Deep len 13–24: inverted loop over printable w2 (and optional full tail variants).
 */
function deepW2SolveLen12to24(
  len,
  w0set,
  w1set,
  targetHash,
  tailVariants,
  { maxW0 = 80, uppercaseOnly = false } = {}
) {
  const hits = new Map();
  const w0arr = [...w0set].slice(0, maxW0);
  const w1arr = [...w1set];
  const allW2 = getAllPrintableW2(uppercaseOnly);

  for (const w0 of w0arr) {
    for (const w1 of w1arr) {
      for (const w2 of allW2) {
        for (const tail of tailVariants) {
          const s = assembleLen12to24(len, w0, w1, w2, tail);
          if (!isValidLen12to24(s, len, uppercaseOnly)) continue;
          const h2 = chainH2FromWordsLen(len, w0, w1, w2);
          const k1 = k1FromTailLen(len, w2, tail);
          const need = (h2 ^ k1) >>> 0;
          if (!needMatchesTarget(need, targetHash)) continue;
          if (computeKamuiHash(s) !== targetHash) continue;
          if (!hits.has(s)) {
            hits.set(s, {
              s,
              w0: wordToAscii(w0),
              w1: wordToAscii(w1),
              w2: wordToAscii(w2),
              source: `deep-w2-len${len}`,
            });
          }
        }
      }
    }
  }
  return [...hits.values()];
}

function deepW2SolveLen14(...args) {
  return deepW2SolveLen12to24(LEN_14, ...args);
}

function pairW2SolveLen12to24(
  len,
  pairKeys,
  targetHash,
  tailVariants,
  { maxPairs = 400, uppercaseOnly = false } = {}
) {
  const hits = new Map();
  const pairs = topPairs(pairKeys, maxPairs);
  const allW2 = getAllPrintableW2(uppercaseOnly);

  for (const [w0, w1] of pairs) {
    for (const w2 of allW2) {
      for (const tail of tailVariants) {
        const s = assembleLen12to24(len, w0, w1, w2, tail);
        if (!isValidLen12to24(s, len, uppercaseOnly)) continue;
        const h2 = chainH2FromWordsLen(len, w0, w1, w2);
        const k1 = k1FromTailLen(len, w2, tail);
        const need = (h2 ^ k1) >>> 0;
        if (!needMatchesTarget(need, targetHash)) continue;
        if (computeKamuiHash(s) !== targetHash) continue;
        if (!hits.has(s)) {
          hits.set(s, {
            s,
            w0: wordToAscii(w0),
            w1: wordToAscii(w1),
            w2: wordToAscii(w2),
            source: `pair-w2-len${len}`,
          });
        }
      }
    }
  }
  return [...hits.values()];
}

function pairW2SolveLen14(...args) {
  return pairW2SolveLen12to24(LEN_14, ...args);
}

/**
 * Corpus-free len=14 recovery: invert fmix → need, outer w2 loop, w0|w1 MITM on s4.
 * k1 depends only on w2[2..3] + tail; h2 chain does not use bytes 12–13.
 */
function solveAnalyticLen14(targetHash, opts = {}) {
  const {
    uppercaseOnly = false,
    constraints: rawConstraints = {},
    maxW2 = Infinity,
    w2Offset = 0,
    onProgress = null,
    skipCorpus = true,
  } = opts;

  const constraints = normalizeConstraints({
    ...rawConstraints,
    uppercaseOnly,
  });
  const charset = uppercaseOnly ? PRINTABLE_UPPER : PRINTABLE;
  const tailPairs = suffixTailPairs(constraints, {
    deep: false,
    uppercaseOnly,
  });
  const needs = needsFromTarget14(targetHash);
  if (needs.length === 0) {
    return {
      error: "invFmix12to24 produced no need candidates",
      needs: [],
      hits: [],
      constraints,
    };
  }

  const hitMap = new Map();
  if (!skipCorpus) {
    for (const h of corpusScanLen14(targetHash, uppercaseOnly)) {
      hitMap.set(h.s, h);
    }
  }

  let w0arr;
  let w1arr;
  let w2slice;
  if (hasConstraints(constraints)) {
    const applied = applyConstraintsToWordSets(
      new Set(),
      new Set(),
      new Set(),
      constraints,
      LEN_14
    );
    w0arr = [...applied.w0set];
    w1arr =
      applied.w1set.size > 0
        ? [...applied.w1set]
        : getAllPrintableW2(uppercaseOnly);
    w2slice =
      applied.w2set.size > 0
        ? [...applied.w2set].slice(w2Offset, w2Offset + maxW2)
        : getAllPrintableW2(uppercaseOnly).slice(w2Offset, w2Offset + maxW2);
  } else {
    const all = getAllPrintableW2(uppercaseOnly);
    w0arr = all;
    w1arr = all;
    w2slice = all.slice(w2Offset, w2Offset + maxW2);
  }

  const report = (msg, extra = {}) => {
    if (onProgress) onProgress({ msg, ...extra });
  };

  report("needs", { count: needs.length, needs: needs.map((n) => "0x" + n.toString(16)) });
  report("search", {
    w0: w0arr.length,
    w1: w1arr.length,
    w2: w2slice.length,
    tails: tailPairs.length,
  });

  for (let wi = 0; wi < w2slice.length; wi++) {
    const w2 = w2slice[wi];
    for (const [b12, b13] of tailPairs) {
      const k1 = k1FromW2Tail(w2, b12, b13);
      for (const need of needs) {
        const h2Req = (need ^ k1) >>> 0;

        const s4Map = new Map();
        for (const w0 of w0arr) {
          const s4Req = invStepA(h2Req, k2FromW0(w0));
          let list = s4Map.get(s4Req);
          if (!list) {
            list = [];
            s4Map.set(s4Req, list);
          }
          list.push(w0);
        }

        for (const w1 of w1arr) {
          for (let ci = 0; ci < charset.length; ci++) {
            const b3 = charset.charCodeAt(ci);
            const s4Fwd = s4FromW0Byte3W1W2(b3, w1, w2);
            const bucket = s4Map.get(s4Fwd);
            if (!bucket) continue;
            for (const w0 of bucket) {
              if (((w0 >>> 24) & 0xff) !== b3) continue;
              const s = assembleLen14(w0, w1, w2, b12, b13);
              if (!isValidLen14(s, uppercaseOnly)) continue;
              if (hasConstraints(constraints) && !matchesConstraints(s, constraints)) {
                continue;
              }
              if (computeKamuiHash(s) !== targetHash) continue;
              if (!hitMap.has(s)) {
                hitMap.set(s, {
                  s,
                  w0: wordToAscii(w0),
                  w1: wordToAscii(w1),
                  w2: wordToAscii(w2),
                  source: "analytic-len14",
                });
              }
            }
          }
        }
      }
    }
    if (onProgress && (wi + 1) % 5000 === 0) {
      report("w2-progress", {
        done: wi + 1,
        total: w2slice.length,
        hits: hitMap.size,
      });
    }
  }

  return {
    needs,
    hits: [...hitMap.values()],
    constraints,
    tailPairs: tailPairs.length,
    wordCounts: {
      w0: w0arr.length,
      w1: w1arr.length,
      w2: w2slice.length,
      strings: 0,
    },
  };
}

function solveTargetLen12to24(targetHash, len, opts = {}) {
  if (!isLen12to24(len)) {
    return { error: `solveTargetLen12to24: length must be 13–24, got ${len}` };
  }

  const {
    deep = false,
    pairW2 = false,
    maxW0Deep = 40,
    maxPairs = 400,
    bucketCap = 16,
    uppercaseOnly = false,
    constraints: rawConstraints = {},
  } = opts;

  const constraints = normalizeConstraints({
    ...rawConstraints,
    uppercaseOnly,
  });

  const hitMap = new Map();
  const addHits = (list, sourceOverride) => {
    for (const h of list) {
      if (!hitMap.has(h.s)) {
        hitMap.set(h.s, { ...h, source: sourceOverride || h.source });
      }
    }
  };

  addHits(corpusScanLen12to24(targetHash, len, uppercaseOnly), `corpus-${len}`);

  const expanded = buildExpandedWordSets({
    includeAllW2: false,
    uppercaseOnly,
    targetLen: len,
    maxPerBucket: constraints.prefix || constraints.suffix ? 50000 : 12000,
  });

  let w0set = expanded.w0;
  let w1set = expanded.w1;
  let w2set = expanded.w2;

  const applied = applyConstraintsToWordSets(
    w0set,
    w1set,
    w2set,
    constraints,
    len
  );
  w0set = applied.w0set;
  w1set = applied.w1set;
  w2set = applied.w2set;

  const tailVariants = suffixTailVariants(constraints, len, {
    deep: deep && !constraints.suffix,
    uppercaseOnly,
  });

  addHits(
    mitmSolveLen12to24(
      len,
      w0set,
      w1set,
      w2set,
      targetHash,
      tailVariants,
      bucketCap,
      uppercaseOnly
    ),
    `mitm-len${len}`
  );

  if (deep) {
    const deepW0Limit =
      constraints.prefix && w0set.size <= 64 ? w0set.size : maxW0Deep;
    addHits(
      deepW2SolveLen12to24(len, w0set, w1set, targetHash, tailVariants, {
        maxW0: deepW0Limit,
        uppercaseOnly,
      }),
      `deep-w2-len${len}`
    );
  }

  if (pairW2) {
    addHits(
      pairW2SolveLen12to24(len, expanded.pairKeys, targetHash, tailVariants, {
        maxPairs,
        uppercaseOnly,
      }),
      `pair-w2-len${len}`
    );
  }

  let hits = [...hitMap.values()];
  if (hasConstraints(constraints)) {
    hits = hits.filter((h) => matchesConstraints(h.s, constraints));
  }

  return {
    hx: null,
    v: null,
    hits,
    constraints,
    tailPairs: tailVariants.length,
    wordCounts: {
      w0: w0set.size,
      w1: w1set.size,
      w2: w2set.size,
      strings: expanded.stringCount,
    },
  };
}

function solveTargetLen14(targetHash, opts = {}) {
  return solveTargetLen12to24(targetHash, LEN_14, opts);
}

function solveTarget(targetHash, opts = {}) {
  return solveTargetMedium(targetHash, LEN_12, opts);
}

/** Light ranking: prefer neutral ordering; weak heuristics only as tie-breaker. */
function rankCandidates(hits) {
  const score = (s) => {
    let sc = 0;
    if (s.includes("\0")) sc -= 1000;
    if (/[\x00-\x1f\x7f]/.test(s)) sc -= 1000;
    return sc;
  };

  return hits
    .map((h) => ({ ...h, score: score(h.s) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.s.localeCompare(b.s);
    });
}

function main() {
  const corpus = loadCorpus();
  console.log("Corpus 12-char:", corpus.length);
}

if (require.main === module) main();

module.exports = {
  solveTarget,
  solveTargetMedium,
  solveMediumComplete,
  solveTargetLen11,
  solveTargetLen12to24,
  solveTargetLen14,
  solveAnalyticLen14,
  rankCandidates,
  loadCorpus,
  isMediumLen,
  mitmSolve,
  mitmSolveMedium,
  mitmSolveLen12to24,
  mitmSolveLen14,
  corpusScanLen12to24,
  corpusScanLen14,
};
