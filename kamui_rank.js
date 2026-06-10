#!/usr/bin/env node
/**
 * Rank Kamui hash collision candidates by Tekken-style naming plausibility.
 * Learns prefixes, tokens, and layout from name_keys.json + output/*.txt.
 */
const fs = require("fs");
const path = require("path");
const { PRINTABLE } = require("./kamui_words");

const ROOT = __dirname;

/** Well-known move families (user + corpus). */
const FAMILY_PREFIXES = {
  Co_: "generic",
  sDm_: "reaction",
  aDw_: "airborne_reaction",
  sGrd_: "guard",
  wDm_: "wall",
  sDw_: "airborne",
  cDm_: "common_dm",
  cGrd_: "common_guard",
  Tco_: "throw_common",
  Esc_: "escape",
};

const MOVE_SUFFIX_RE = /^\d[A-Za-z0-9]{2}$/;
const CHAR_PREFIX_RE = /^[A-Z][A-Za-z]_/;
const THREE_CHAR_PREFIX_RE = /^[A-Z][a-z]{2}_/;

let cachedModel = null;

function isPrintableName(s) {
  if (!s || typeof s !== "string") return false;
  for (let i = 0; i < s.length; i++) {
    if (!PRINTABLE.includes(s[i])) return false;
  }
  return true;
}

function bump(map, key, n = 1) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + n);
}

function topSet(map, minCount = 2) {
  return new Set(
    [...map.entries()]
      .filter(([, c]) => c >= minCount)
      .map(([k]) => k)
  );
}

/** Extract resolved move names from motbin text dumps. */
function extractOutputNames() {
  const names = [];
  const outDir = path.join(ROOT, "output");
  if (!fs.existsSync(outDir)) return names;

  const lineRe =
    /^\s*\d+\s+0x[0-9a-f]+\s+0x[0-9a-f]+(?:\s+[0-9A-Fa-f]{8})?\s+\d+\s+\d+\s+(\S+)\s+/;

  for (const file of fs.readdirSync(outDir)) {
    if (!file.endsWith(".txt")) continue;
    const raw = fs.readFileSync(path.join(outDir, file), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(lineRe);
      if (!m) continue;
      const name = m[1];
      if (name !== "-" && /^[A-Za-z0-9_]+$/.test(name)) names.push(name);
    }
  }
  return names;
}

function loadNameKeyStrings() {
  try {
    return Object.values(require(path.join(ROOT, "name_keys.json"))).filter(
      (s) => typeof s === "string"
    );
  } catch {
    return [];
  }
}

function buildNamingModel() {
  const strings = [...loadNameKeyStrings(), ...extractOutputNames()];
  const dictionary = new Set(strings);
  const prefix4 = new Map();
  const prefix3 = new Map();
  const prefix2 = new Map();
  const charPrefixes = new Map();
  const suffixAfterChar = new Map();
  const lengths = new Map();
  const tokens = new Map();
  const fullStrings = new Map();

  for (const s of strings) {
    if (!isPrintableName(s)) continue;
    bump(fullStrings, s);
    bump(lengths, s.length);

    if (s.length >= 4 && s[3] === "_") bump(prefix4, s.slice(0, 4));
    if (s.length >= 3 && s[2] === "_") bump(prefix3, s.slice(0, 3));
    if (s.length >= 2 && s[1] === "_") bump(prefix2, s.slice(0, 2));

    const charM = s.match(/^([A-Z][A-Za-z])_/);
    if (charM) {
      const p = charM[1] + "_";
      bump(charPrefixes, p);
      if (s.length > p.length) bump(suffixAfterChar, s.slice(p.length));
    }

    for (const part of s.split("_")) {
      if (part.length >= 2 && part.length <= 8) bump(tokens, part);
    }
  }

  const outputChars = new Set();
  const outDir = path.join(ROOT, "output");
  if (fs.existsSync(outDir)) {
    for (const f of fs.readdirSync(outDir)) {
      if (f.endsWith(".txt")) outputChars.add(f.replace(/\.txt$/i, ""));
    }
  }

  return {
    dictionary,
    prefix4: topSet(prefix4, 3),
    prefix3: topSet(prefix3, 5),
    charPrefixes: topSet(charPrefixes, 3),
    charPrefixWeights: charPrefixes,
    prefix4Weights: prefix4,
    suffixAfterChar: topSet(suffixAfterChar, 2),
    suffixWeights: suffixAfterChar,
    tokenWeights: tokens,
    lengthWeights: lengths,
    outputChars,
    stringCount: strings.length,
  };
}

function getModel() {
  if (!cachedModel) cachedModel = buildNamingModel();
  return cachedModel;
}

function scoreFamilyPrefix(s, model) {
  for (const [pfx, family] of Object.entries(FAMILY_PREFIXES)) {
    if (s.startsWith(pfx)) {
      const w = model.prefix4Weights.get(pfx) || 0;
      return { score: 420 + Math.min(80, Math.log2(w + 1) * 8), family, prefix: pfx };
    }
  }
  return null;
}

function scoreCharPrefix(s, model) {
  const m2 = s.match(/^([A-Z][A-Za-z])_/);
  if (m2) {
    const p = m2[1] + "_";
    const w = model.charPrefixWeights.get(p) || 0;
    if (w > 0 || model.charPrefixes.has(p)) {
      return {
        score: 380 + Math.min(100, Math.log2(w + 1) * 10),
        prefix: p,
        kind: "char2",
      };
    }
  }

  const m3 = s.match(/^([A-Z][a-z]{2})_/);
  if (m3) {
    const p = m3[1] + "_";
    const w = model.charPrefixWeights.get(p) || model.prefix4Weights.get(p) || 0;
    if (w > 0) {
      return {
        score: 360 + Math.min(90, Math.log2(w + 1) * 9),
        prefix: p,
        kind: "char3",
      };
    }
  }

  return null;
}

function scoreSuffixAndBody(s, model, prefixLen) {
  let score = 0;
  const parts = [];
  const tail = s.slice(prefixLen);
  if (!tail) return { score: -50, parts: ["empty_body"] };

  if (MOVE_SUFFIX_RE.test(tail)) {
    const w = model.suffixWeights.get(tail) || 0;
    score += 140 + Math.min(60, Math.log2(w + 1) * 6);
    parts.push("move_notation");
  }

  for (const part of tail.split("_").filter(Boolean)) {
    const w = model.tokenWeights.get(part) || 0;
    if (w >= 3) {
      score += 25 + Math.min(40, Math.log2(w) * 4);
      parts.push(`token:${part}`);
    }
  }

  return { score, parts };
}

/**
 * @param {string} s
 * @param {object} [model]
 * @returns {{ score: number, reasons: string[], flags: string[] }}
 */
function scoreCollisionCandidate(s, model = getModel()) {
  const reasons = [];
  const flags = [];
  let score = 0;

  if (!s || typeof s !== "string") {
    return { score: -1e9, reasons: ["invalid"], flags: ["reject"] };
  }

  // if (model.dictionary.has(s)) {
  //   score += 1200;
  //   reasons.push("in_dictionary");
  //   flags.push("dictionary");
  // }

  if (!isPrintableName(s)) {
    score -= 800;
    reasons.push("non_printable_charset");
    flags.push("reject");
    return { score, reasons, flags };
  }

  const lenW = model.lengthWeights.get(s.length) || 0;
  if (lenW > 0) {
    score += 30 + Math.min(40, Math.log2(lenW) * 3);
    reasons.push(`len_${s.length}_common`);
  } else if (s.length < 4 || s.length > 24) {
    score -= 40;
    reasons.push("unusual_length");
  }

  if (/^[0-9]/.test(s)) {
    score -= 220;
    reasons.push("digit_start");
    flags.push("unlikely");
  }

  if (/^_/.test(s)) {
    score -= 280;
    reasons.push("underscore_start");
    flags.push("unlikely");
  }

  const unders = (s.match(/_/g) || []).length;
  if (unders === 0 && s.length >= 5) {
    score -= 90;
    reasons.push("no_underscore");
    flags.push("unlikely");
  } else if (unders >= 1 && unders <= 3) {
    score += 20;
  } else if (unders > 4) {
    score -= 30;
    reasons.push("many_underscores");
  }

  const family = scoreFamilyPrefix(s, model);
  if (family) {
    score += family.score;
    reasons.push(`family:${family.family}`);
    flags.push("family");
  }

  let prefixLen = 0;
  const charP = scoreCharPrefix(s, model);
  if (charP) {
    score += charP.score;
    prefixLen = charP.prefix.length;
    reasons.push(`char_prefix:${charP.prefix}`);
    flags.push("char");
  } else if (s.includes("_")) {
    const idx = s.indexOf("_");
    const stub = s.slice(0, idx + 1);
    if (model.prefix3.has(stub) || model.prefix4.has(s.slice(0, 4))) {
      score += 120;
      prefixLen = stub.length;
      reasons.push(`known_prefix:${stub}`);
    } else if (idx === 2 || idx === 3) {
      score -= 60;
      reasons.push("unknown_short_prefix");
      prefixLen = idx + 1;
    }
  }

  if (prefixLen > 0) {
    const body = scoreSuffixAndBody(s, model, prefixLen);
    score += body.score;
    reasons.push(...body.parts);
  }

  if (CHAR_PREFIX_RE.test(s) && s.length <= 8) {
    const tail = s.slice(s.indexOf("_") + 1);
    if (/^[0-9]/.test(tail)) {
      score += 50;
      reasons.push("char_digit_tail");
    }
  }

  if (/[a-z]/.test(s) && /[A-Z]/.test(s)) {
    if (!s.includes("_")) {
      score -= 35;
      reasons.push("mixed_case_no_sep");
    }
  }

  if (/[a-z]{2,}/.test(s) && !/_[a-z]/.test(s) && !charP && !family) {
    const lowerRun = s.match(/[a-z]{3,}/);
    if (lowerRun) {
      score -= 25;
      reasons.push("long_lowercase_run");
    }
  }

  if (/[A-Z]{4,}/.test(s)) {
    score -= 20;
    reasons.push("long_uppercase_run");
  }

  return { score: Math.round(score), reasons, flags };
}

/**
 * @param {string[]} candidates
 * @param {object} [options]
 * @returns {Array<{ s: string, score: number, reasons: string[], flags: string[] }>}
 */
function rankCollisions(candidates, options = {}) {
  const model = options.model || getModel();
  const verifyHash = options.verifyHash >>> 0;
  const { computeKamuiHash } = options.hashFn || require("./hash");

  const ranked = [...new Set(candidates)]
    .filter((s) => typeof s === "string" && s.length > 0)
    .map((s) => {
      const { score, reasons, flags } = scoreCollisionCandidate(s, model);
      const entry = { s, score, reasons, flags };
      if (verifyHash) {
        entry.hash = computeKamuiHash(s) >>> 0;
        entry.hashMatch = entry.hash === verifyHash;
      }
      return entry;
    });

  if (verifyHash != null && verifyHash !== undefined) {
    const mism = ranked.filter((r) => !r.hashMatch);
    if (mism.length) {
      ranked.forEach((r) => {
        if (!r.hashMatch) {
          r.score -= 5000;
          r.flags.push("hash_mismatch");
          r.reasons.push("hash_mismatch");
        }
      });
    }
  }

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.s.localeCompare(b.s);
  });

  return ranked;
}

function parseHashArg(arg) {
  if (!arg) return null;
  const s = String(arg).trim().toLowerCase();
  if (s.startsWith("0x")) {
    const n = parseInt(s.slice(2), 16);
    return Number.isFinite(n) ? n >>> 0 : null;
  }
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n >>> 0 : null;
}

function loadCandidates(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

function printReport(ranked, { maxShow = 50, verifyHash } = {}) {
  if (verifyHash) {
    console.log("Target hash: 0x" + (verifyHash >>> 0).toString(16));
  }
  console.log("Ranked", ranked.length, "candidates (higher = more plausible)");
  console.log("");

  const show = ranked.slice(0, maxShow);
  show.forEach((r, i) => {
    const dict = r.flags.includes("dictionary") ? " [dict]" : "";
    const hash = r.hashMatch === false ? " [HASH MISMATCH]" : "";
    console.log(
      `${String(i + 1).padStart(2)}. ${r.s}  score=${r.score}${dict}${hash}`
    );
    if (r.reasons.length) console.log("    ", r.reasons.slice(0, 6).join(", "));
  });

  if (ranked.length > show.length) {
    console.log("");
    console.log(`… ${ranked.length - show.length} more not shown`);
  }
}

function main() {
  const argv = process.argv.slice(2);
  let file = null;
  let hash = null;
  let json = false;
  let maxShow = 50;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") json = true;
    else if (a === "--hash" || a === "-H") hash = parseHashArg(argv[++i]);
    else if (a === "--max") maxShow = parseInt(argv[++i], 10) || 50;
    else if (!a.startsWith("-")) file = a;
  }

  let candidates = [];
  if (file) {
    candidates = loadCandidates(path.isAbsolute(file) ? file : path.join(ROOT, file));
  } else if (!process.stdin.isTTY) {
    const raw = fs.readFileSync(0, "utf8");
    candidates = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
  }

  if (!candidates.length) {
    console.error("Usage: node kamui_rank.js <candidates.txt> [--hash 0x...] [--json] [--max N]");
    console.error("   or: type candidates | node kamui_rank.js --hash 0x...");
    process.exit(1);
  }

  if (hash == null && candidates.length) {
    const { computeKamuiHash } = require("./hash");
    const h0 = computeKamuiHash(candidates[0]) >>> 0;
    const allSame = candidates.every(
      (s) => (computeKamuiHash(s) >>> 0) === h0
    );
    if (allSame) hash = h0;
  }

  const ranked = rankCollisions(candidates, {
    verifyHash: hash != null ? hash : undefined,
  });

  if (json) {
    console.log(JSON.stringify({ hash: hash ? "0x" + hash.toString(16) : null, ranked }, null, 2));
    return;
  }

  printReport(ranked, { maxShow, verifyHash: hash });
}

if (require.main === module) main();

module.exports = {
  buildNamingModel,
  getModel,
  scoreCollisionCandidate,
  rankCollisions,
};
