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
  kMidFromW1,
  hXorKmidFromV,
} = require("./kamui_analyze");
const {
  wordToAscii,
  buildExpandedWordSets,
  topPairs,
  getAllPrintableW2,
  isValidLen12,
  normalizeConstraints,
  hasConstraints,
  matchesConstraints,
  applyConstraintsToWordSets,
} = require("./kamui_words");

function bytesFromW(w) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(w >>> 0, 0);
  return b;
}

function assembleString(w0, w1, w2) {
  const buf = Buffer.alloc(12);
  buf.writeUInt32LE(w0 >>> 0, 0);
  buf.writeUInt32LE(w1 >>> 0, 4);
  buf.writeUInt32LE(w2 >>> 0, 8);
  return buf.toString("ascii");
}

function loadCorpus() {
  const corpus = new Set();
  const add = (s) => {
    if (typeof s === "string" && s.length === 12) corpus.add(s);
  };

  try {
    const nk = require("./name_keys.json");
    for (const v of Object.values(nk)) add(v);
  } catch (_) {}

  for (const f of ["anim_names.json"]) {
    const p = path.join(__dirname, f);
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, "utf8");
    const re = /[A-Za-z0-9_]{12}/g;
    let m;
    while ((m = re.exec(raw))) add(m[0]);
  }

  for (const rel of ["output.txt", "output/aml.txt"]) {
    const p = path.join(__dirname, rel);
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, "utf8");
    const re = /\b([A-Za-z0-9_]{12})\b/g;
    let m;
    while ((m = re.exec(raw))) add(m[0]);
  }

  return [...corpus];
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
 * For each w0, try every printable w2 (finds preimages missing from fragment w2 set).
 */
function deepW2Solve(hx, w0set, w1set, targetHash, { maxW0 = 80, uppercaseOnly = false } = {}) {
  const hits = new Map();
  const w0arr = [...w0set].slice(0, maxW0);
  const w1arr = [...w1set];
  const allW2 = getAllPrintableW2(uppercaseOnly);

  for (const w0 of w0arr) {
    const hToW2 = new Map();
    for (const w2 of allW2) {
      const hv = hFromW0W2(w0, w2) >>> 0;
      if (!hToW2.has(hv)) hToW2.set(hv, w2);
    }
    for (const w1 of w1arr) {
      const need = (hx ^ kMidFromW1(w1)) >>> 0;
      const w2 = hToW2.get(need);
      if (w2 === undefined) continue;
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

function solveTarget(targetHash, opts = {}) {
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
  if (vList.length > 1) return { error: "Ambiguous fmix preimage", vList };

  const hx = hXorKmidFromV(vList[0]);
  const expanded = buildExpandedWordSets({ includeAllW2: false, uppercaseOnly });
  const fmt = generateFormatWords();

  let w0set = expanded.w0;
  let w1set = expanded.w1;
  let w2set = expanded.w2;

  if (formatFallback) {
    w0set = mergeSets(w0set, fmt.w0);
    w1set = mergeSets(w1set, fmt.w1);
    w2set = mergeSets(w2set, fmt.w2);
  }

  const applied = applyConstraintsToWordSets(w0set, w1set, w2set, constraints);
  w0set = applied.w0set;
  w1set = applied.w1set;
  w2set = applied.w2set;

  // Full w2 brute (15.7M) is only via explicit --deep; prefix search uses narrow w0 + corpus MITM.
  const useDeep = deep;

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
    mitmSolve(hx, w0set, w1set, w2set, targetHash, bucketCap, uppercaseOnly),
    "mitm"
  );

  if (useDeep) {
    addHits(
      deepW2Solve(hx, w0set, w1set, targetHash, {
        maxW0: Math.max(maxW0Deep, w0set.size),
        uppercaseOnly,
      }),
      constraints.prefix ? "prefix-deep-w2" : "deep-w2"
    );
  }

  if (pairW2) {
    addHits(
      pairW2Solve(hx, expanded.pairKeys, targetHash, { maxPairs, uppercaseOnly }),
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
    wordCounts: {
      w0: w0set.size,
      w1: w1set.size,
      w2: w2set.size,
      strings: expanded.stringCount,
    },
  };
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
  rankCandidates,
  loadCorpus,
  mitmSolve,
};
