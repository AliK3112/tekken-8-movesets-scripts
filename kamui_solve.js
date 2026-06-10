const { computeKamuiHash } = require("./hash");

const TARGET = [0x2ef33bb2, 0x497797cf];
const found = new Map();

function hit(s) {
  if (s.length !== 12) return;
  const h = computeKamuiHash(s);
  if (TARGET.includes(h) && !found.has(h)) {
    found.set(h, s);
    console.log("FOUND", s, "0x" + h.toString(16));
  }
}

const C1 = 0xcc9e2d51;
const C2 = 0x1b873593;
const MIX_SUB = 0x052250ec;
const MIX_MUL1 = 0x3361d2af;
const FMIX1 = 0x85ebca6b;
const FMIX2 = 0xc2b2ae35;
const rol4 = (v, c) => (((v << (c & 31)) | (v >>> (32 - (c & 31)))) >>> 0);
const mix = (k) => {
  k = Math.imul(k, C1) >>> 0;
  k = rol4(k, 15);
  return Math.imul(k, C2) >>> 0;
};

function hashLen12(w0, w1, w2) {
  const len = 12;
  const k_start = mix((len + w0) >>> 0);
  let h =
    Math.imul(5, (rol4(Math.imul(5, len) ^ k_start, 13) - MIX_SUB) >>> 0) >>> 0;
  const k_end = mix((Math.imul(5, len) + w2) >>> 0);
  h = Math.imul(5, (rol4(h ^ k_end, 13) - MIX_SUB) >>> 0) >>> 0;
  const valSub = (0x318f97d9 - Math.imul(MIX_MUL1, w1)) >>> 0;
  const k_mid = Math.imul(C2, rol4(valSub, 15)) >>> 0;
  const v = rol4(h ^ k_mid, 13);
  const t = Math.imul(5, (v - MIX_SUB) >>> 0) >>> 0;
  const f = Math.imul(FMIX1, t ^ (t >>> 16)) >>> 0;
  const r = Math.imul(FMIX2, f ^ (f >>> 13)) >>> 0;
  return (r ^ (r >>> 16)) >>> 0;
}

function bruteLast2Bytes(prefix10, target) {
  if (prefix10.length !== 10) return null;
  const buf = Buffer.alloc(12);
  buf.write(prefix10, 0, 10, "ascii");
  const w0 = buf.readUInt32LE(0);
  const w1 = buf.readUInt32LE(4);
  for (let c10 = 0; c10 < 256; c10++) {
    for (let c11 = 0; c11 < 256; c11++) {
      buf[10] = c10;
      buf[11] = c11;
      const w2 = buf.readUInt32LE(8);
      if (hashLen12(w0, w1, w2) === target) {
        return buf.toString("ascii");
      }
    }
  }
  return null;
}

function bruteW2Limited(w0, w1, target, byteFilter) {
  const buf = Buffer.alloc(12);
  buf.writeUInt32LE(w0, 0);
  buf.writeUInt32LE(w1, 4);
  for (let w2 = 0; w2 < 0x100000000; w2++) {
    buf.writeUInt32LE(w2 >>> 0, 8);
    if (byteFilter && !byteFilter(buf)) continue;
    if (hashLen12(w0, w1, w2 >>> 0) === target) {
      return buf.toString("ascii");
    }
  }
  return null;
}

console.log("=== Structured Tekken-style patterns ===");
const codes = [
  "aml",
  "amlyt",
  "amlpl",
  "amlto",
  "amlam",
  "amlyo",
  "amlko",
  "amlmx",
  "amlys",
];
const dirs = ["lp", "rp", "lk", "rk", "uv", "rn", "6lp", "4wk", "wup", "3lk", "1lp"];
const cand = new Set();
for (const c1 of codes) {
  for (const p of ["_at_", "_th_", "_co_"]) {
    for (const d of dirs) {
      for (const tail of ["_n", "_y", "00", "01", "02", "lp", "rp", "p_n", "k_n"]) {
        let s = c1 + p + d;
        if (s.length < 12) s += tail;
        if (s.length === 12) cand.add(s);
        s = c1 + p + d + tail;
        if (s.length === 12) cand.add(s);
      }
    }
  }
}
for (const s of cand) hit(s);

console.log("=== aml_w/s vr + win patterns ===");
for (let w = 0; w < 100; w++) {
  const ws = (w < 10 ? "0" : "") + w;
  for (let v = 0; v < 100; v++) {
    const vs = (v < 10 ? "0" : "") + v;
    hit(`aml_w${ws}_vr${vs}`);
    hit(`aml_s${ws}_vr${vs}`);
    hit(`aml_win_${ws}_y`.slice(0, 12));
  }
}

console.log("=== 8-char prefix + 4 tail ===");
const prefixes = [
  "amlto_at_",
  "amlpl_at_",
  "amlyt_at_",
  "amlam_at_",
  "amlko_at_",
  "amlmx_ra_",
  "amlys_at_",
];
const tailChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";
for (const pre of prefixes) {
  for (const c1 of tailChars) {
    for (const c2 of tailChars) {
      for (const c3 of tailChars) {
        for (const c4 of tailChars) {
          hit(pre + c1 + c2 + c3 + c4);
        }
      }
    }
  }
}

console.log("=== aml??_at_* + numeric ===");
for (const c2 of "ytplomksx") {
  for (const mid of dirs) {
    for (let n = 0; n < 100; n++) {
      const ns = (n < 10 ? "0" : "") + n;
      const variants = [
        `aml${c2}_at_${mid}`,
        `aml${c2}_at_${mid}${ns}`,
        `aml${c2}__at_${mid}`,
      ];
      for (const s of variants) {
        if (s.length === 12) hit(s);
      }
    }
  }
}

console.log("=== Brute last 2 bytes on known 10-char prefixes ===");
const nk = require("./name_keys.json");
const bases10 = new Set();
for (const v of Object.values(nk)) {
  if (typeof v === "string" && v.length === 12) bases10.add(v.slice(0, 10));
}
for (const t of TARGET) {
  for (const base of bases10) {
    const r = bruteLast2Bytes(base, t);
    if (r) {
      console.log("brute10 hit", base, "->", r, "for 0x" + t.toString(16));
      hit(r);
    }
  }
}

console.log("=== Brute w2 for aml* w0/w1 (ASCII printable) ===");
const filterPrintable = (buf) => {
  for (let i = 8; i < 12; i++) {
    const c = buf[i];
    if (c < 0x20 || c > 0x7e) return false;
  }
  return true;
};
for (let a = 0; a < 26; a++) {
  for (let b = 0; b < 26; b++) {
    for (let c = 0; c < 26; c++) {
      const buf = Buffer.alloc(8);
      buf.write(`aml${String.fromCharCode(65 + a)}${String.fromCharCode(65 + b)}${String.fromCharCode(65 + c)}`, 0);
      const w0 = buf.readUInt32LE(0);
      const w1 = buf.readUInt32LE(4);
      for (const t of TARGET) {
        if (found.has(t)) continue;
        const r = bruteW2Limited(w0, w1, t, filterPrintable);
        if (r) {
          console.log("w2 brute", r, "0x" + t.toString(16));
          hit(r);
        }
      }
    }
  }
}

console.log("DONE", [...found.entries()]);
