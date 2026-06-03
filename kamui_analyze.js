/**
 * Kamui-Hash (len=12) analytical inversion.
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

function hashLen12Words(w0, w1, w2) {
  const len = 12;
  const k_start = mix((len + w0) >>> 0);
  let h = imul(5, (rol(imul(5, len) ^ k_start, 13) - MIX_SUB) >>> 0);
  const k_end = mix((imul(5, len) + w2) >>> 0);
  h = imul(5, (rol(h ^ k_end, 13) - MIX_SUB) >>> 0);
  const k_mid = imul(C2, rol((0x318f97d9 - imul(MIX_MUL1, w1)) >>> 0, 15));
  const v = rol(h ^ k_mid, 13);
  const t = imul(5, (v - MIX_SUB) >>> 0);
  const f = imul(FMIX1, t ^ (t >>> 16));
  const r = imul(FMIX2, f ^ (f >>> 13));
  return (r ^ (r >>> 16)) >>> 0;
}

/** v = rol(h ^ k_mid, 13)  =>  h ^ k_mid = ror(v, 13) */
function hXorKmidFromV(v) {
  return ror(v, 13);
}

/** Forward h from w0,w2 only (k_mid treated separately). */
function hFromW0W2(w0, w2) {
  const len = 12;
  const k_start = mix((len + w0) >>> 0);
  let h = imul(5, (rol(imul(5, len) ^ k_start, 13) - MIX_SUB) >>> 0);
  const k_end = mix((imul(5, len) + w2) >>> 0);
  return imul(5, (rol(h ^ k_end, 13) - MIX_SUB) >>> 0);
}

function kMidFromW1(w1) {
  return imul(C2, rol((0x318f97d9 - imul(MIX_MUL1, w1)) >>> 0, 15));
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

module.exports = {
  invFinalToV,
  hashLen12Words,
  hFromW0W2,
  kMidFromW1,
  hXorKmidFromV,
  mix,
};
