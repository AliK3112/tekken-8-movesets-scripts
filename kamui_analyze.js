/**
 * Kamui-Hash analytical inversion (len 5–12 medium path, len 13–24 computeKamuiHash12To24).
 * Game strings use A-Za-z0-9_; uppercase-only A-Z0-9_ is a special-case subset.
 */
const { computeKamuiHash } = require("./hash");

const C1 = 0xcc9e2d51;
const C2 = 0x1b873593;
const MIX_SUB = 0x052250ec;
const MIX_MUL1 = 0x3361d2af;
const FMIX1 = 0x85ebca6b;
const FMIX2 = 0xc2b2ae35;

const imul = (a, b) => Math.imul(a, b) >>> 0;
const rol = (v, c) => ((v << c) | (v >>> (32 - c))) >>> 0;
const ror = (v, c) => rol(v, 32 - c);

function modInvOdd(a) {
  let x = 1;
  for (let i = 0; i < 5; i++) x = imul(x, 2 - imul(a >>> 0, x));
  return x >>> 0;
}

function mix(k) {
  k = imul(k, C1);
  k = rol(k, 15);
  return imul(k, C2);
}

const INV_C1 = modInvOdd(C1);
const INV_C2 = modInvOdd(C2);

/** Inverse of mix(): mix is a bijection on uint32. */
function invMix(y) {
  let k = imul(y >>> 0, INV_C2);
  k = ror(k, 15);
  return imul(k, INV_C1) >>> 0;
}

function invXorShift16(y) {
  const out = [];
  for (let H = 0; H < 65536; H++) {
    const L = (y ^ imul(H, 0x10001)) & 0xffff;
    const r = ((H << 16) | L) >>> 0;
    if ((r ^ (r >>> 16)) >>> 0 === y) out.push(r);
  }
  return out;
}

function invXorShift13(y) {
  const out = [];
  for (let T = 0; T < 1 << 19; T++) {
    const L = (y ^ imul(T, 0x2001)) & 0x1fff;
    const f = ((T << 13) | L) >>> 0;
    if ((f ^ (f >>> 13)) >>> 0 === y) out.push(f);
  }
  return out;
}

/** Invert final 3 layers → set of v values (typically 1). */
function invFinalToV(target) {
  const invF2 = modInvOdd(FMIX2);
  const invF1 = modInvOdd(FMIX1);
  const inv5 = modInvOdd(5);
  const vs = new Set();
  for (const r of invXorShift16(target)) {
    const x = imul(r, invF2);
    for (const f of invXorShift13(x)) {
      const g = imul(f, invF1);
      for (const t of invXorShift16(g)) {
        const vCand = (imul(t, inv5) + MIX_SUB) >>> 0;
        if (imul(5, (vCand - MIX_SUB) >>> 0) !== t) continue;
        vs.add(vCand);
      }
    }
  }
  return [...vs];
}

/** read32 index for k_mid on medium-path lengths 5–12 */
function midReadOffset(len) {
  return (len >> 1) & 4;
}

/** read32 index for k_end on medium-path lengths 5–12 */
function endReadOffset(len) {
  return len - 4;
}

/**
 * Word layout for medium-path lengths 5–12 (computeKamuiHash small branch).
 * wStart @0, wMid @midOff, wEnd @(len-4); overlapping LE32 reads share bytes.
 */
function mediumLayout(len) {
  if (len < 5 || len > 12) {
    throw new Error(`mediumLayout: length must be 5–12, got ${len}`);
  }
  const midOff = midReadOffset(len);
  const endOff = endReadOffset(len);
  const midSameAsStart = midOff === 0;
  const midSameAsEnd = midOff === endOff;
  const links = [];
  if (!midSameAsStart && !midSameAsEnd && endOff <= midOff + 3) {
    for (let i = 0; i < 4; i++) {
      const pos = endOff + i;
      const midByte = pos - midOff;
      if (midByte >= 0 && midByte < 4) links.push({ midByte, endByte: i });
    }
  }
  return { len, midOff, endOff, midSameAsStart, midSameAsEnd, links };
}

function hashMediumWords(w0, wMid, wEnd, len) {
  const k_start = mix((len + w0) >>> 0);
  let h = imul(5, (rol(imul(5, len) ^ k_start, 13) - MIX_SUB) >>> 0);
  const k_end = mix((imul(5, len) + wEnd) >>> 0);
  h = imul(5, (rol(h ^ k_end, 13) - MIX_SUB) >>> 0);
  const k_mid = imul(C2, rol((0x318f97d9 - imul(MIX_MUL1, wMid)) >>> 0, 15));
  const v = rol(h ^ k_mid, 13);
  const t = imul(5, (v - MIX_SUB) >>> 0);
  const f = imul(FMIX1, t ^ (t >>> 16));
  const r = imul(FMIX2, f ^ (f >>> 13));
  return (r ^ (r >>> 16)) >>> 0;
}

function hashLen12Words(w0, w1, w2) {
  return hashMediumWords(w0, w1, w2, 12);
}

function hashLen11Words(w0, wMid, wEnd) {
  return hashMediumWords(w0, wMid, wEnd, 11);
}

/** v = rol(h ^ k_mid, 13)  =>  h ^ k_mid = ror(v, 13) */
function hXorKmidFromV(v) {
  return ror(v, 13);
}

/** Forward h1 from w0 only (k_start path), for medium-path length. */
function h1FromW0(w0, len) {
  const k_start = mix((len + w0) >>> 0);
  return imul(5, (rol(imul(5, len) ^ k_start, 13) - MIX_SUB) >>> 0);
}

/** Forward h after k_start + k_end (before k_mid xor) for medium-path length. */
function hFromW0End(w0, wEnd, len) {
  const h = h1FromW0(w0, len);
  const k_end = mix((imul(5, len) + wEnd) >>> 0);
  return imul(5, (rol(h ^ k_end, 13) - MIX_SUB) >>> 0);
}

const INV5 = modInvOdd(5);

/**
 * Solve wMid analytically from (w0, wEnd): wMid is uniquely determined.
 * hx = h2 ^ k_mid(wMid)  ⇒  k_mid = hx ^ h2  ⇒  wMid = invKMid(k_mid).
 */
function solveWMidMedium(hx, w0, wEnd, len) {
  const h2 = hFromW0End(w0, wEnd, len) >>> 0;
  return wMidFromKMid((hx ^ h2) >>> 0);
}

/**
 * Solve wEnd analytically from (w0, wMid): wEnd is uniquely determined.
 * h2 = hx ^ k_mid(wMid); invert the k_end layer using h1(w0).
 */
function solveWEndMedium(hx, w0, wMid, len) {
  const h2 = (hx ^ kMidFromWord(wMid)) >>> 0;
  const h1 = h1FromW0(w0, len);
  const B = (imul(h2, INV5) + MIX_SUB) >>> 0; // B = rol(h1 ^ k_end, 13)
  const k_end = (h1 ^ ror(B, 13)) >>> 0;
  return (invMix(k_end) - imul(5, len)) >>> 0;
}

/**
 * Solve w0 analytically from (wMid, wEnd): w0 is uniquely determined.
 * h2 = hx ^ k_mid(wMid); invert k_end layer to h1, then invert k_start layer.
 */
function solveW0Medium(hx, wMid, wEnd, len) {
  const h2 = (hx ^ kMidFromWord(wMid)) >>> 0;
  const k_end = mix((imul(5, len) + wEnd) >>> 0);
  const B = (imul(h2, INV5) + MIX_SUB) >>> 0; // B = rol(h1 ^ k_end, 13)
  const h1 = (k_end ^ ror(B, 13)) >>> 0;
  const A = (imul(h1, INV5) + MIX_SUB) >>> 0; // A = rol(5len ^ k_start, 13)
  const k_start = (imul(5, len) ^ ror(A, 13)) >>> 0;
  return (invMix(k_start) - len) >>> 0;
}

/** Forward h from w0,w2 only (len=12 layout; k_mid treated separately). */
function hFromW0W2(w0, w2) {
  return hFromW0End(w0, w2, 12);
}

function kMidFromWord(wMid) {
  return imul(C2, rol((0x318f97d9 - imul(MIX_MUL1, wMid)) >>> 0, 15));
}

/** Inverse of kMidFromWord (bijection on uint32). */
function wMidFromKMid(kMid) {
  const inner = ror(imul(kMid >>> 0, modInvOdd(C2)), 15);
  return imul((0x318f97d9 - inner) >>> 0, modInvOdd(MIX_MUL1)) >>> 0;
}

function kMidFromW1(w1) {
  return kMidFromWord(w1);
}

/**
 * Given fixed w0,w1, solve for w2 such that h(w0,w2) ^ k_mid(w1) = hx.
 * h is affine in k_end(w2) through one xor+rol+mul layer — not linear in w2.
 * For fixed suffix bytes 10-11, w2 search is 256^2 per byte 8-9 — still small;
 * here we enumerate w2 analytically via precomputed k_end table only when needed.
 */
function solveW2ForHxW0(w0, hx) {
  const len = 12;
  const k_start = mix((len + w0) >>> 0);
  const h0 = imul(5, (rol(imul(5, len) ^ k_start, 13) - MIX_SUB) >>> 0);
  const hits = [];
  // w2 is 32-bit but only bytes 8-11 matter; 2^32 is forbidden — use structure:
  // k_end = mix(60 + w2). For each high-byte pattern from ASCII constraints, use
  // meet-in-the-middle on k_end values (65536 k_end images for byte10-11 only).
  return hits;
}

// ---- len 13–24: computeKamuiHash12To24 (used for len=14 story / throw names) ----

const MIX_SUB2 = 0x19ab949c;
const INV_FMIX1 = modInvOdd(FMIX1);
const INV_FMIX2 = modInvOdd(FMIX2);
const LEN14 = 14;

function offsets12to24(len) {
  const mid = len >> 1;
  return {
    len,
    mid,
    k1: len - 4,
    k2: 0,
    k3: mid,
    k4: len - 8,
    k5: 4,
    k6: mid - 4,
  };
}

function le32(bytes) {
  return (
    ((bytes[0] & 0xff) |
      ((bytes[1] & 0xff) << 8) |
      ((bytes[2] & 0xff) << 16) |
      ((bytes[3] & 0xff) << 24)) >>>
    0
  );
}

function chainH2FromWordsLen(len, w0, w1, w2) {
  const buf = Buffer.alloc(Math.max(len, 12));
  buf.writeUInt32LE(w0 >>> 0, 0);
  buf.writeUInt32LE(w1 >>> 0, 4);
  buf.writeUInt32LE(w2 >>> 0, 8);
  const o = offsets12to24(len);
  const k6 = mix(read32buf(buf, o.k6));
  const k5 = mix(read32buf(buf, o.k5));
  const k4 = mix(read32buf(buf, o.k4));
  const k3 = mix(read32buf(buf, o.k3));
  const k2 = mix(read32buf(buf, o.k2));
  let h = o.len >>> 0;
  h = (h ^ k6) >>> 0;
  h = imul(5, (rol(h, 13) - MIX_SUB) >>> 0);
  h = (h ^ k5) >>> 0;
  h = (imul(5, rol(h, 13)) - MIX_SUB2) >>> 0;
  h = (h ^ k4) >>> 0;
  h = imul(5, (rol(h, 13) - MIX_SUB) >>> 0);
  h = (h ^ k3) >>> 0;
  h = (imul(5, rol(h, 13)) - MIX_SUB2) >>> 0;
  h = (h ^ k2) >>> 0;
  h = imul(5, (rol(h, 13) - MIX_SUB) >>> 0);
  return h >>> 0;
}

/** k1 for len 13–24; tail bytes after offset k1+3 do not affect h2 chain. */
function k1FromTailLen(len, w2, tailBytes) {
  const buf = Buffer.alloc(Math.max(len, 12));
  buf.writeUInt32LE(w2 >>> 0, 8);
  const o = offsets12to24(len);
  const start = o.k1;
  for (let i = 0; i < 4; i++) {
    const bi = start + i;
    if (bi < len && i < tailBytes.length) buf[bi] = tailBytes[i] & 0xff;
  }
  return mix(read32buf(buf, o.k1));
}

function needsFromTarget12to24(target) {
  return needsFromTarget14(target);
}

function read32buf(buf, offset) {
  return buf.readUInt32LE(offset);
}

function stepA(h, k) {
  return imul(5, (rol((h ^ k) >>> 0, 13) - MIX_SUB) >>> 0);
}

function stepB(h, k) {
  return (imul(5, rol((h ^ k) >>> 0, 13)) - MIX_SUB2) >>> 0;
}

function invStepA(target, k) {
  const x = (imul(target >>> 0, INV5) + MIX_SUB) >>> 0;
  return (ror(x, 13) ^ k) >>> 0;
}

function invStepB(target, k) {
  const x = imul((target + MIX_SUB2) >>> 0, INV5);
  return (ror(x, 13) ^ k) >>> 0;
}

/** Invert `out = f ^ (f >> 16)` used at the end of computeKamuiHash12To24. */
function invHiwordXorOut(out) {
  const fs = [];
  for (let hi = 0; hi < 65536; hi++) {
    const lo = (out ^ (hi ^ (hi << 16))) & 0xffff;
    const f = ((hi << 16) | lo) >>> 0;
    if ((f ^ hi) >>> 0 === (out >>> 0)) fs.push(f);
  }
  return fs;
}

/** Invert the full fmix tail of computeKamuiHash12To24. Returns h where fmix12to24(h) === target. */
function invFmix12to24(target) {
  const hs = new Set();
  for (const r of invHiwordXorOut(target >>> 0)) {
    const x = imul(r, INV_FMIX2);
    for (const f of invXorShift13(x)) {
      const g = imul(f, INV_FMIX1);
      for (const t of invXorShift16(g)) {
        const h = (imul(t, INV5) + MIX_SUB) >>> 0;
        if (fmix12to24(h) === (target >>> 0)) hs.add(h >>> 0);
      }
    }
  }
  return [...hs];
}

/** need values such that fmix12to24(rol(need, 13)) === target. Typically 0–2. */
function needsFromTarget14(target) {
  const needs = new Set();
  for (const h of invFmix12to24(target >>> 0)) {
    needs.add(ror(h, 13) >>> 0);
  }
  return [...needs];
}

function k2FromW0(w0) {
  return mix(w0 >>> 0);
}

function k5FromW1(w1) {
  return mix(w1 >>> 0);
}

/** LE32 @ offset 3: bytes w0[3], w1[0..2]. */
function k6FromW0W1(w0, w1) {
  const word =
    ((w0 >>> 24) & 0xff) |
    ((w1 & 0xff) << 8) |
    (((w1 >>> 8) & 0xff) << 16) |
    (((w1 >>> 16) & 0xff) << 24);
  return mix(word >>> 0);
}

/** LE32 @ offset 6: bytes w1[2..3], w2[0..1]. */
function k4FromW1W2(w1, w2) {
  const word =
    ((w1 >>> 16) & 0xff) |
    (((w1 >>> 24) & 0xff) << 8) |
    ((w2 & 0xff) << 16) |
    (((w2 >>> 8) & 0xff) << 24);
  return mix(word >>> 0);
}

/** LE32 @ offset 7: bytes w1[3], w2[0..2]. */
function k3FromW1W2(w1, w2) {
  const word =
    ((w1 >>> 24) & 0xff) |
    ((w2 & 0xff) << 8) |
    (((w2 >>> 8) & 0xff) << 16) |
    (((w2 >>> 16) & 0xff) << 24);
  return mix(word >>> 0);
}

/** Len=14 shortcut: k1 from w2[2..3] + tail bytes 12–13. */
function k1FromW2Tail(w2, b12, b13) {
  return k1FromTailLen(14, w2, [b12, b13]);
}

function s3FromW0W1W2(w0, w1, w2) {
  let h = LEN14;
  h = stepA(h, k6FromW0W1(w0, w1));
  h = stepB(h, k5FromW1(w1));
  return stepA(h, k4FromW1W2(w1, w2));
}

function s4FromW0W1W2(w0, w1, w2) {
  return stepB(s3FromW0W1W2(w0, w1, w2), k3FromW1W2(w1, w2));
}

/** s4 after k6..k4 when only w0[3] (not full w0) is varied. */
function s4FromW0Byte3W1W2(b3, w1, w2) {
  const w0stub = (b3 & 0xff) << 24;
  return s4FromW0W1W2(w0stub, w1, w2);
}

/** Final fmix inside computeKamuiHash12To24 (differs from the len 5–12 medium path). */
function fmix12to24(h) {
  let f = imul(5, (h - MIX_SUB) >>> 0);
  f = (f ^ (f >>> 16)) >>> 0;
  f = imul(f, FMIX1);
  f = (f ^ (f >>> 13)) >>> 0;
  f = imul(f, FMIX2);
  return (f ^ ((f >>> 16) & 0xffff)) >>> 0;
}

/**
 * Mix chain through k6..k2 only (len=14 layout). Returns h2 before the final
 * `h ^= k1; h = rol(h, 13)` step.
 */
function chainH2Len14(buf) {
  const len = 14;
  const mid = len >> 1;
  const k6 = mix(read32buf(buf, mid - 4));
  const k5 = mix(read32buf(buf, 4));
  const k4 = mix(read32buf(buf, len - 8));
  const k3 = mix(read32buf(buf, mid));
  const k2 = mix(read32buf(buf, 0));

  let h = len >>> 0;
  h = (h ^ k6) >>> 0;
  h = imul(5, (rol(h, 13) - MIX_SUB) >>> 0);
  h = (h ^ k5) >>> 0;
  h = (imul(5, rol(h, 13)) - MIX_SUB2) >>> 0;
  h = (h ^ k4) >>> 0;
  h = imul(5, (rol(h, 13) - MIX_SUB) >>> 0);
  h = (h ^ k3) >>> 0;
  h = (imul(5, rol(h, 13)) - MIX_SUB2) >>> 0;
  h = (h ^ k2) >>> 0;
  h = imul(5, (rol(h, 13) - MIX_SUB) >>> 0);
  return h >>> 0;
}

/** k1 chunk for len=14 (bytes 10–13). */
function k1Len14(buf) {
  return mix(read32buf(buf, 10));
}

/**
 * need = h2 ^ k1 = state before final xor+rol; target iff fmix12to24(rol(need, 13)) === hash.
 */
function needFromBuf14(buf) {
  return (chainH2Len14(buf) ^ k1Len14(buf)) >>> 0;
}

function needMatchesTarget(need, targetHash) {
  return fmix12to24(rol(need, 13)) === (targetHash >>> 0);
}

/** h2 before final k1 xor; tail bytes from offset k1 do not affect this chain. */
function chainH2FromWords(w0, w1, w2, len = LEN14) {
  return chainH2FromWordsLen(len, w0, w1, w2);
}

function k1FromWordsTail(len, w2, tailBytes) {
  return k1FromTailLen(len, w2, tailBytes);
}

function hashLen14Words(w0, w1, w2, b12, b13) {
  const need = (chainH2FromWords(w0, w1, w2, 14) ^ k1FromWordsTail(14, w2, [b12, b13])) >>> 0;
  return fmix12to24(rol(need, 13));
}

module.exports = {
  invFinalToV,
  hashLen12Words,
  hashLen11Words,
  hashMediumWords,
  hashLen14Words,
  hFromW0W2,
  hFromW0End,
  kMidFromW1,
  kMidFromWord,
  wMidFromKMid,
  invMix,
  h1FromW0,
  solveWMidMedium,
  solveWEndMedium,
  solveW0Medium,
  hXorKmidFromV,
  midReadOffset,
  endReadOffset,
  mediumLayout,
  mix,
  fmix12to24,
  invFmix12to24,
  needsFromTarget14,
  stepA,
  stepB,
  invStepA,
  invStepB,
  chainH2Len14,
  chainH2FromWords,
  k1Len14,
  k1FromW2Tail,
  k1FromWordsTail,
  k2FromW0,
  k5FromW1,
  k6FromW0W1,
  k4FromW1W2,
  k3FromW1W2,
  s3FromW0W1W2,
  s4FromW0W1W2,
  s4FromW0Byte3W1W2,
  needFromBuf14,
  needMatchesTarget,
  MIX_SUB2,
  LEN14,
  offsets12to24,
  chainH2FromWordsLen,
  k1FromTailLen,
  needsFromTarget12to24,
};
