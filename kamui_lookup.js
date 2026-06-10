#!/usr/bin/env node
/**
 * Recover Kamui-Hash preimages (len 5–12 medium path, len 13–24 computeKamuiHash12To24).
 */
const { computeKamuiHash } = require("./hash");
const {
  solveTargetMedium,
  solveTargetLen12to24,
  solveAnalyticLen14,
  rankCandidates,
  isMediumLen,
} = require("./kamui_recover");
const { needsFromTarget14 } = require("./kamui_analyze");
const {
  isValidLen,
  isValidLen14,
  isLen12to24,
  PRINTABLE,
  PRINTABLE_UPPER,
  normalizeConstraints,
  hasConstraints,
  matchesConstraints,
} = require("./kamui_words");

const DEFAULT_LEN = 12;
const MEDIUM_LEN_MIN = 5;
const MEDIUM_LEN_MAX = 12;
const LEN_12TO24_MIN = 13;
const LEN_12TO24_MAX = 24;
const SUPPORTED_LENS = new Set([
  ...Array.from({ length: MEDIUM_LEN_MAX - MEDIUM_LEN_MIN + 1 }, (_, i) => i + MEDIUM_LEN_MIN),
  ...Array.from({ length: LEN_12TO24_MAX - LEN_12TO24_MIN + 1 }, (_, i) => i + LEN_12TO24_MIN),
]);

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
  // temporarily disabled
  return null;
  if (!nk) return null;
  const dec = String(hash >>> 0);
  return nk[dec] ?? null;
}

function parseLenArg(kv) {
  const raw = kv["--len"];
  if (raw == null || raw === "") return DEFAULT_LEN;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || !SUPPORTED_LENS.has(n)) {
    throw new Error(`Invalid --len (supported: 5–12, 13–24): ${raw}`);
  }
  return n;
}

function isValidForLen(s, len, uppercaseOnly) {
  return isValidLen(s, len, uppercaseOnly);
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
    if (a.startsWith("--len=")) {
      kv["--len"] = a.slice(6);
      continue;
    }
    if (a.startsWith("--max-w2=")) {
      kv["--max-w2"] = a.slice(10);
      continue;
    }
    if (a.startsWith("--w2-offset=")) {
      kv["--w2-offset"] = a.slice(12);
      continue;
    }
    if (a.startsWith("--max-iter=")) {
      kv["--max-iter"] = a.slice(11);
      continue;
    }

    if (a === "--len" || a === "-l") {
      takeValue("--len", argv[++i]);
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
    if (a === "--max-w2") {
      takeValue("--max-w2", argv[++i]);
      continue;
    }
    if (a === "--w2-offset") {
      takeValue("--w2-offset", argv[++i]);
      continue;
    }
    if (a === "--max-iter") {
      takeValue("--max-iter", argv[++i]);
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
    strLen = DEFAULT_LEN,
    formatFallback = false,
    deep = false,
    pairW2 = false,
    analytic = false,
    analyticVerbose = false,
    maxResults = 100,
    maxW0Deep = 80,
    maxPairs = 400,
    maxW2 = Infinity,
    w2Offset = 0,
    uppercaseOnly = false,
    constraints = {},
    maxIter,
  } = options;

  if (!SUPPORTED_LENS.has(strLen)) {
    return { error: `Unsupported string length: ${strLen} (use 5–12 or 13–24)` };
  }

  const normalizedConstraints = normalizeConstraints({
    ...constraints,
    uppercaseOnly,
  });

  const nk = loadNameKeys();
  const direct = directLookup(targetHash, nk);
  if (
    direct &&
    direct.length === strLen &&
    isValidForLen(direct, strLen, uppercaseOnly) &&
    (!hasConstraints(normalizedConstraints) ||
      matchesConstraints(direct, normalizedConstraints))
  ) {
    return {
      strLen,
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

  const passes = [];

  if (isMediumLen(strLen)) {
    const solveOpts = (extra = {}) => ({
      formatFallback: strLen === 12 && formatFallback,
      deep,
      pairW2: strLen === 12 && pairW2,
      bucketCap: 32,
      uppercaseOnly,
      constraints: normalizedConstraints,
      maxW0Deep,
      maxPairs,
      maxIter,
      ...extra,
    });

    let res = solveTargetMedium(targetHash, strLen, solveOpts());
    if (res.error) return { strLen, error: res.error };
    passes.push(`medium-len${strLen}`);

    if (formatFallback && strLen !== 12) {
      passes.push("(format ignored for --len != 12)");
    }
    if (pairW2 && strLen !== 12) {
      passes.push("(pair-w2 ignored for --len != 12)");
    }

    return finalizeResults({
      strLen,
      targetHash,
      res,
      passes,
      normalizedConstraints,
      uppercaseOnly,
      maxResults,
    });
  }

  if (isLen12to24(strLen)) {
    if (analytic) {
      if (strLen !== 14) {
        return {
          strLen,
          error: "--analytic is only implemented for --len 14 (use corpus MITM for len 13)",
        };
      }
      let res = solveAnalyticLen14(targetHash, {
        uppercaseOnly,
        constraints: normalizedConstraints,
        maxW2,
        w2Offset,
        skipCorpus: true,
        onProgress: analyticVerbose
          ? (p) => console.error("[analytic]", JSON.stringify(p))
          : null,
      });
      if (res.error) return { strLen, error: res.error };
      passes.push(
        `analytic-len14(needs=${res.needs.length},w2=${res.wordCounts.w2})`
      );
      return finalizeResults({
        strLen,
        targetHash,
        res: { ...res, v: null, hx: null },
        passes,
        normalizedConstraints,
        uppercaseOnly,
        maxResults,
      });
    }

    const solveOpts = (extra = {}) => ({
      deep: false,
      pairW2: false,
      bucketCap: 32,
      uppercaseOnly,
      constraints: normalizedConstraints,
      maxW0Deep,
      maxPairs,
      ...extra,
    });

    let res = solveTargetLen12to24(targetHash, strLen, solveOpts());
    if (res.error) return { strLen, error: res.error };
    passes.push(`mitm-len${strLen}(tails=${res.tailPairs})`);

    if (deep) {
      const resDeep = solveTargetLen12to24(
        targetHash,
        strLen,
        solveOpts({ deep: true })
      );
      passes.push(`deep-w2-len${strLen}(${maxW0Deep} w0)`);
      for (const h of resDeep.hits) {
        if (!res.hits.some((x) => x.s === h.s)) res.hits.push(h);
      }
    }

    if (pairW2) {
      const resPair = solveTargetLen12to24(
        targetHash,
        strLen,
        solveOpts({ pairW2: true, maxPairs })
      );
      passes.push(`pair-w2-len${strLen}(${maxPairs})`);
      for (const h of resPair.hits) {
        if (!res.hits.some((x) => x.s === h.s)) res.hits.push(h);
      }
    }

    if (formatFallback) {
      passes.push(`(format ignored for --len ${strLen})`);
    }

    return finalizeResults({
      strLen,
      targetHash,
      res,
      passes,
      normalizedConstraints,
      uppercaseOnly,
      maxResults,
    });
  }

  return { strLen, error: `Unsupported string length: ${strLen}` };
}

function finalizeResults({
  strLen,
  res,
  passes,
  normalizedConstraints,
  uppercaseOnly,
  maxResults,
}) {
  const ranked = rankCandidates(res.hits);
  const seen = new Set();
  const results = [];
  for (const r of ranked) {
    if (seen.has(r.s)) continue;
    seen.add(r.s);
    if (!isValidForLen(r.s, strLen, uppercaseOnly)) continue;
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
    strLen,
    direct: null,
    constraints: normalizedConstraints,
    charset: uppercaseOnly ? PRINTABLE_UPPER : PRINTABLE,
    v: res.v,
    hx: res.hx,
    pass: passes.join(" → "),
    wordCounts: res.wordCounts,
    exhaustive: res.exhaustive,
    incompleteNote: res.incompleteNote,
    totalFound: res.hits.length,
    results,
  };
}

function printReport(hash, out, maxShow) {
  const hex = "0x" + (hash >>> 0).toString(16).padStart(8, "0");
  console.log("Target hash:", hex, `(${hash >>> 0})`);
  console.log("String length:", out.strLen ?? DEFAULT_LEN);
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

  if (out.v != null && out.hx != null) {
    console.log("Inverted: v=0x" + out.v.toString(16), "h^k_mid=0x" + out.hx.toString(16));
  } else if (isLen12to24(out.strLen)) {
    const needs = needsFromTarget14(hash);
    console.log(
      "Inverted:",
      needs.length
        ? `need=0x${needs.map((n) => n.toString(16)).join(",0x")} (fmix12to24(rol(need,13)))`
        : "invFmix12to24 failed"
    );
  }
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
  if (out.wordCounts && out.wordCounts.complete) {
    console.log(
      `Complete analytic search: exhaustive (derived ${out.wordCounts.derive}, ${out.wordCounts.freeBytes} free bytes enumerated).`
    );
  }
  if (out.incompleteNote) {
    const need = Math.ceil(out.incompleteNote.cost);
    console.log(
      `NOTE: full analytic search needs ~${need.toLocaleString()} iterations ` +
        `(${out.incompleteNote.freeBytes} free bytes) - above the default cap, so results below are corpus-assisted and NOT exhaustive.`
    );
    console.log(
      `      For a guaranteed-complete search, re-run with: --max-iter ${need}`
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
    const hint = isMediumLen(out.strLen)
      ? out.strLen === 12
        ? "No candidates. Try: --format --deep --pair-w2"
        : out.incompleteNote
          ? `No candidates in the corpus-assisted pass. Re-run with --max-iter ${Math.ceil(out.incompleteNote.cost)} for a complete analytic search.`
          : out.strLen >= 5 && out.strLen <= 11
            ? "No candidates. Add a --prefix and/or --suffix (or --suffix _n / _y) to enable a complete analytic search."
            : `No candidates. Try: --deep (full tail-word brute for len ${out.strLen})`
      : isLen12to24(out.strLen)
        ? "No candidates. Try: --analytic (len 14 only), --deep, --pair-w2, or --suffix _n"
        : "No candidates.";
    console.log(hint);
    return;
  }

  out.results.forEach((r, i) => {
    const ok =
      (computeKamuiHash(r.s) >>> 0) === (hash >>> 0) ? "ok" : "MISMATCH";
    const parts = r.w0 ? `  [${r.w0}|${r.w1}|${r.w2}]` : "";
    // console.log(`${i + 1}. ${r.s}${parts}  (${r.source}, ${ok})`);
    console.log(`${r.s}`);
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
  let strLen;
  try {
    maxResults = parseMaxResults(kv, flags);
    strLen = parseLenArg(kv);
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
  --len N       String length: 5–12 (medium path) or 13–24 (default 12)
  --prefix STR  Known start (sDm_, aDw_, Pl_, It_, …)
  --suffix STR  Known end of the name
  --contains STR  Must contain this substring
  --max N       Show up to N candidates (default 100); also -m N or --max=N
  --all         List every candidate found (no cap)
  --format      Add Tekken token fragments (len 12 only)
  --max-iter N  Len 5–12: cap analytic enumeration (default 2e8); raise for prefix/suffix-only
  --deep        Full tail-word brute (len 5–12: wEnd; len 13–24: w2)
  --pair-w2     Brute w2 for top pairs from corpus (len 12–24)
  --analytic    Len 14 only: corpus-free invert + w2-outer / w0|w1 MITM (slow)
  --max-w2 N    With --analytic: cap w2 scan count (default: all ~15.7M)
  --w2-offset N Resume --analytic from w2 index N
  --analytic-verbose  Progress lines on stderr during --analytic
  --uppercase-only  Restrict to A-Z0-9_ only
  --json        JSON output
  -h, --help

Examples:
  node kamui_lookup.js 0x70623515 --prefix Pl_
  node kamui_lookup.js 0x103a0b --len 9 --prefix An_
  node kamui_lookup.js 0x5ed550 --len 13 --suffix _n
  node kamui_lookup.js 0x131dbc22 --len 11 --prefix It_
  node kamui_lookup.js 0xcf9a85a6 --len 14 --analytic --prefix Esc_Jz_front --suffix _n
  node kamui_lookup.js 0x4772e656 --len 14 --analytic --suffix _n --max-w2 100000
`);
    process.exit(positional.length === 0 ? 1 : 0);
  }

  const hash = parseHashArg(positional[0]);
  if (hash == null) {
    console.error("Invalid hash:", positional[0]);
    process.exit(1);
  }

  let maxW2 = Infinity;
  let w2Offset = 0;
  if (kv["--max-w2"] != null && kv["--max-w2"] !== "") {
    const n = parseInt(kv["--max-w2"], 10);
    if (!Number.isFinite(n) || n < 1) {
      console.error("Invalid --max-w2:", kv["--max-w2"]);
      process.exit(1);
    }
    maxW2 = n;
  }
  if (kv["--w2-offset"] != null && kv["--w2-offset"] !== "") {
    const n = parseInt(kv["--w2-offset"], 10);
    if (!Number.isFinite(n) || n < 0) {
      console.error("Invalid --w2-offset:", kv["--w2-offset"]);
      process.exit(1);
    }
    w2Offset = n;
  }

  let maxIter;
  if (kv["--max-iter"] != null && kv["--max-iter"] !== "") {
    const n = Number(kv["--max-iter"]);
    if (!Number.isFinite(n) || n < 1) {
      console.error("Invalid --max-iter:", kv["--max-iter"]);
      process.exit(1);
    }
    maxIter = n;
  }

  const out = findCandidates(hash, {
    strLen,
    formatFallback: flags.has("--format"),
    deep: flags.has("--deep"),
    pairW2: flags.has("--pair-w2"),
    analytic: flags.has("--analytic"),
    analyticVerbose: flags.has("--analytic-verbose"),
    uppercaseOnly: flags.has("--uppercase-only"),
    maxResults,
    maxW0Deep,
    maxPairs,
    maxW2,
    w2Offset,
    maxIter,
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

module.exports = {
  findCandidates,
  parseHashArg,
  parseCliArgs,
  parseMaxResults,
  parseLenArg,
  DEFAULT_LEN,
  SUPPORTED_LENS,
};
