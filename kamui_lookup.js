#!/usr/bin/env node
/**
 * Recover 12-char Kamui-Hash preimages (dictionary MITM + optional w2 completion).
 * Default charset: A-Za-z0-9_ (all Tekken motbin / animation names).
 * Use --uppercase-only only for special cases (e.g. stage IDs: A-Z0-9_).
 */
const { computeKamuiHash } = require("./hash");
const { invFinalToV } = require("./kamui_analyze");
const { solveTarget, rankCandidates } = require("./kamui_recover");
const {
  isValidLen12,
  PRINTABLE,
  PRINTABLE_UPPER,
  normalizeConstraints,
  hasConstraints,
  matchesConstraints,
} = require("./kamui_words");

const LEN = 12;

function parseHashArg(arg) {
  if (!arg) return null;
  const s = arg.trim().toLowerCase();
  if (s.startsWith("0x")) {
    const n = parseInt(s.slice(2), 16);
    return Number.isFinite(n) ? n >>> 0 : null;
  }
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n >>> 0 : null;
}

function loadNameKeys() {
  try {
    return require("./name_keys.json");
  } catch {
    return null;
  }
}

function directLookup(hash, nk) {
  if (!nk) return null;
  const dec = String(hash >>> 0);
  return nk[dec] ?? null;
}

function parseCliArgs(argv) {
  const flags = new Set();
  const kv = {};
  const positional = [];

  const takeValue = (key, value) => {
    if (value === undefined || value.startsWith("-")) {
      throw new Error(`Missing value for ${key}`);
    }
    kv[key] = value;
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    if (a.startsWith("--max=")) {
      kv["--max"] = a.slice(6);
      continue;
    }
    if (a.startsWith("--prefix=")) {
      kv["--prefix"] = a.slice(9);
      continue;
    }
    if (a.startsWith("--suffix=")) {
      kv["--suffix"] = a.slice(9);
      continue;
    }
    if (a.startsWith("--contains=")) {
      kv["--contains"] = a.slice(11);
      continue;
    }

    if (a === "--max" || a === "-m" || a === "-n") {
      takeValue("--max", argv[++i]);
      continue;
    }
    if (a === "--prefix" || a === "-p") {
      takeValue("--prefix", argv[++i]);
      continue;
    }
    if (a === "--suffix" || a === "-s") {
      takeValue("--suffix", argv[++i]);
      continue;
    }
    if (a === "--contains" || a === "-c") {
      takeValue("--contains", argv[++i]);
      continue;
    }

    if (a.startsWith("-")) {
      flags.add(a);
      continue;
    }
    positional.push(a);
  }

  return { flags, kv, positional };
}

function parseMaxResults(kv, flags) {
  if (flags.has("--all")) return Infinity;
  if (kv["--max"] == null || kv["--max"] === "") return 100;
  const n = parseInt(kv["--max"], 10);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`Invalid --max value: ${kv["--max"]}`);
  }
  return n;
}

function findCandidates(targetHash, options = {}) {
  const {
    formatFallback = false,
    deep = false,
    pairW2 = false,
    maxResults = 100,
    maxW0Deep = 80,
    maxPairs = 400,
    uppercaseOnly = false,
    constraints = {},
  } = options;

  const normalizedConstraints = normalizeConstraints({
    ...constraints,
    uppercaseOnly,
  });

  const nk = loadNameKeys();
  const direct = directLookup(targetHash, nk);
  if (
    direct &&
    direct.length === LEN &&
    isValidLen12(direct, uppercaseOnly) &&
    (!hasConstraints(normalizedConstraints) ||
      matchesConstraints(direct, normalizedConstraints))
  ) {
    return {
      direct,
      constraints: normalizedConstraints,
      charset: uppercaseOnly ? PRINTABLE_UPPER : PRINTABLE,
      results: [
        {
          s: direct,
          source: "name_keys.json",
          w0: "",
          w1: "",
          w2: "",
          score: 0,
        },
      ],
      pass: "dictionary",
    };
  }

  const vList = invFinalToV(targetHash);
  if (vList.length === 0) {
    return { error: "Could not invert final hash layers (not len=12 Kamui path?)" };
  }
  if (vList.length > 1) {
    return { error: "Ambiguous fmix preimage", vList };
  }

  const passes = [];

  const solveOpts = (extra = {}) => ({
    formatFallback: false,
    deep: false,
    pairW2: false,
    bucketCap: 32,
    uppercaseOnly,
    constraints: normalizedConstraints,
    ...extra,
  });

  let res = solveTarget(targetHash, solveOpts());
  passes.push("expanded");

  if (formatFallback) {
    const resFmt = solveTarget(targetHash, solveOpts({ formatFallback: true }));
    passes.push("format");
    for (const h of resFmt.hits) {
      if (!res.hits.some((x) => x.s === h.s)) res.hits.push({ ...h, source: "format" });
    }
  }

  if (deep) {
    const resDeep = solveTarget(
      targetHash,
      solveOpts({ formatFallback, deep: true, maxW0Deep })
    );
    passes.push(`deep-w2(${maxW0Deep} w0)`);
    for (const h of resDeep.hits) {
      if (!res.hits.some((x) => x.s === h.s)) res.hits.push(h);
    }
  }

  if (pairW2) {
    const resPair = solveTarget(
      targetHash,
      solveOpts({ pairW2: true, maxPairs })
    );
    passes.push(`pair-w2(${maxPairs})`);
    for (const h of resPair.hits) {
      if (!res.hits.some((x) => x.s === h.s)) res.hits.push(h);
    }
  }

  const ranked = rankCandidates(res.hits);
  const seen = new Set();
  const results = [];
  for (const r of ranked) {
    if (seen.has(r.s)) continue;
    seen.add(r.s);
    if (!isValidLen12(r.s, uppercaseOnly)) continue;
    results.push({
      s: r.s,
      source: r.source,
      w0: r.w0,
      w1: r.w1,
      w2: r.w2,
      score: r.score,
    });
    if (results.length >= maxResults) break;
  }

  return {
    direct: null,
    constraints: normalizedConstraints,
    charset: uppercaseOnly ? PRINTABLE_UPPER : PRINTABLE,
    v: res.v,
    hx: res.hx,
    pass: passes.join(" → "),
    wordCounts: res.wordCounts,
    totalFound: res.hits.length,
    results,
  };
}

function printReport(hash, out, maxShow) {
  const hex = "0x" + (hash >>> 0).toString(16).padStart(8, "0");
  console.log("Target hash:", hex, `(${hash >>> 0})`);
  console.log("String length:", LEN);
  if (out.charset) {
    console.log(
      "Charset:",
      out.charset.length,
      "chars",
      out.charset === PRINTABLE_UPPER ? "(A-Z0-9_ uppercase-only)" : "(A-Za-z0-9_ default)"
    );
  }
  if (out.constraints && hasConstraints(out.constraints)) {
    const parts = [];
    if (out.constraints.prefix) parts.push(`prefix="${out.constraints.prefix}"`);
    if (out.constraints.suffix) parts.push(`suffix="${out.constraints.suffix}"`);
    if (out.constraints.contains) parts.push(`contains="${out.constraints.contains}"`);
    console.log("Constraints:", parts.join(" "));
  }
  console.log("");

  if (out.error) {
    console.error("Error:", out.error);
    process.exit(1);
  }

  if (out.direct) {
    console.log("Exact match in name_keys.json:");
    console.log(" ", out.direct);
    console.log("");
    return;
  }

  console.log("Inverted: v=0x" + out.v.toString(16), "h^k_mid=0x" + out.hx.toString(16));
  console.log("Passes:", out.pass);
  if (out.wordCounts) {
    console.log(
      "Word pools: w0=" + out.wordCounts.w0,
      "w1=" + out.wordCounts.w1,
      "w2=" + out.wordCounts.w2,
      "from",
      out.wordCounts.strings,
      "source strings"
    );
  }
  const listed = out.results.length;
  const cap = Number.isFinite(maxShow) ? maxShow : listed;
  console.log("Total preimages found:", out.totalFound);
  console.log(
    "Showing:",
    listed,
    listed >= out.totalFound || listed < cap
      ? "(all listed)"
      : `(cap --max ${cap})`
  );
  console.log("");

  if (out.results.length === 0) {
    console.log("No candidates. Try: --format --deep --pair-w2");
    return;
  }

  out.results.forEach((r, i) => {
    const ok =
      (computeKamuiHash(r.s) >>> 0) === (hash >>> 0) ? "ok" : "MISMATCH";
    const parts = r.w0 ? `  [${r.w0}|${r.w1}|${r.w2}]` : "";
    console.log(`${i + 1}. ${r.s}${parts}  (${r.source}, ${ok})`);
  });

  if (out.totalFound > listed) {
    console.log("");
    console.log(
      `… and ${out.totalFound - listed} more not shown (use --max ${out.totalFound} or --all)`
    );
  }

  if (out.totalFound > 1) {
    console.log("");
    console.log(
      "Listed in alphabetical order (weak ranking). Multiple strings can share one hash."
    );
  }
}

function main() {
  let flags;
  let kv;
  let positional;
  try {
    ({ flags, kv, positional } = parseCliArgs(process.argv.slice(2)));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  let maxResults;
  try {
    maxResults = parseMaxResults(kv, flags);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const maxW0Deep = 80;
  const maxPairs = 400;

  if (flags.has("-h") || flags.has("--help") || positional.length === 0) {
    console.log(`Usage: node kamui_lookup.js <hash> [options]

  <hash>       Hex (0x70623515) or decimal

Options:
  --prefix STR  Known start of the 12-char name (e.g. Pl_)
  --suffix STR  Known end of the name
  --contains STR  Must contain this substring
  --max N       Show up to N candidates (default 100); also -m N or --max=N
  --all         List every candidate found (no cap)
  --format      Add Tekken token fragments beyond name_keys n-grams
  --deep        Brute w2 over full charset per w0 (auto on with --prefix if w0 is small)
  --pair-w2     Brute w2 for top (w0,w1) pairs from corpus (slower)
  --uppercase-only  Restrict to A-Z0-9_ only
  --json        JSON output
  -h, --help

Example:
  node kamui_lookup.js 0x70623515 --prefix Pl_
`);
    process.exit(positional.length === 0 ? 1 : 0);
  }

  const hash = parseHashArg(positional[0]);
  if (hash == null) {
    console.error("Invalid hash:", positional[0]);
    process.exit(1);
  }

  const out = findCandidates(hash, {
    formatFallback: flags.has("--format"),
    deep: flags.has("--deep"),
    pairW2: flags.has("--pair-w2"),
    uppercaseOnly: flags.has("--uppercase-only"),
    maxResults,
    maxW0Deep,
    maxPairs,
    constraints: {
      prefix: kv["--prefix"],
      suffix: kv["--suffix"],
      contains: kv["--contains"],
    },
  });

  if (flags.has("--json")) {
    console.log(JSON.stringify({ hash: "0x" + (hash >>> 0).toString(16), ...out }, null, 2));
    return;
  }

  printReport(hash, out, maxResults);
}

if (require.main === module) main();

module.exports = { findCandidates, parseHashArg, parseCliArgs, parseMaxResults };
