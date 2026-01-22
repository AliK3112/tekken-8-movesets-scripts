const C1 = 0xCC9E2D51;
const C2 = 0x1B873593;

const MIX_SUB = 0x052250EC;
const MIX_SUB2 = 0x19AB949C;
const MIX_MUL1 = 0x3361D2AF;

const FMIX1 = 0x85EBCA6B;
const FMIX2 = 0xC2B2AE35;

function rol4(v, count) {
    count = count & 31;
    return ((v << count) | (v >>> (32 - count))) >>> 0;
}

function ror4(v, count) {
    return rol4(v, -count);
}

function mix_chunk(k) {
    k = Math.imul(k, C1) >>> 0;
    k = rol4(k, 15);
    k = Math.imul(k, C2) >>> 0;
    return k;
}

function read32(buf, offset) {
    return buf.readUInt32LE(offset);
}

function byteswap32(v) {
    return ((v >>> 24) & 0xFF) | 
           ((v >>> 8) & 0xFF00) | 
           ((v << 8) & 0xFF0000) | 
           ((v << 24) & 0xFF000000) >>> 0;
}

function computeKamuiHash12To24(data) {
    const length = data.length;
    // Pointers
    const end = length; // offset to end
    const mid = length >> 1;

    const k1 = mix_chunk(read32(data, end - 4));
    const k2 = mix_chunk(read32(data, 0));
    const k3 = mix_chunk(read32(data, mid));
    const k4 = mix_chunk(read32(data, end - 8));
    const k5 = mix_chunk(read32(data, 4));
    const k6 = mix_chunk(read32(data, mid - 4));

    let h = length >>> 0;

    h = (h ^ k6) >>> 0;
    h = (Math.imul(5, (rol4(h, 13) - MIX_SUB) >>> 0)) >>> 0;
    h = (h ^ k5) >>> 0;
    h = (Math.imul(5, rol4(h, 13)) - MIX_SUB2) >>> 0;
    h = (h ^ k4) >>> 0;
    h = (Math.imul(5, (rol4(h, 13) - MIX_SUB) >>> 0)) >>> 0;
    h = (h ^ k3) >>> 0;
    h = (Math.imul(5, rol4(h, 13)) - MIX_SUB2) >>> 0;
    h = (h ^ k2) >>> 0;
    h = (Math.imul(5, (rol4(h, 13) - MIX_SUB) >>> 0)) >>> 0;
    h = (h ^ k1) >>> 0;
    h = rol4(h, 13);

    let f = (Math.imul(5, (h - MIX_SUB) >>> 0)) >>> 0;
    f = (f ^ (f >>> 16)) >>> 0;
    f = Math.imul(f, FMIX1) >>> 0;
    f = (f ^ (f >>> 13)) >>> 0;
    f = Math.imul(f, FMIX2) >>> 0;

    // return f ^ HIWORD(f); HIWORD is top 16 bits of 32-bit int? 
    // Wait, HIWORD macro: WORDn(x, HIGH_IND(x, _WORD))
    // On 32-bit uint, high word is bits 16-31.
    // In C, standard Windows HIWORD(x) is ((x >> 16) & 0xFFFF).
    return (f ^ ((f >>> 16) & 0xFFFF)) >>> 0;
}

/**
 * @param {string} str
 * @returns {number}
 */
function computeKamuiHash(str) {
    const data = Buffer.from(str, 'utf8');
    const length = data.length;

    // 1. Long input (> 24 bytes)
    if (length > 24) {
        const k4 = mix_chunk(read32(data, length - 4));
        const k8 = mix_chunk(read32(data, length - 8));
        const k12 = mix_chunk(read32(data, length - 12));
        const k16 = mix_chunk(read32(data, length - 16));
        const k20 = mix_chunk(read32(data, length - 20));

        let h1 = Math.imul(5, (rol4(length ^ k4, 13) - MIX_SUB) >>> 0) >>> 0;
        let v14 = Math.imul(5, (rol4(k16 ^ h1, 13) - MIX_SUB) >>> 0) >>> 0;

        let h2 = Math.imul(5, (rol4(Math.imul(C1, length) ^ k8, 13) - MIX_SUB) >>> 0) >>> 0;
        let v15 = Math.imul(5, (rol4(k12 ^ h2, 13) - MIX_SUB) >>> 0) >>> 0;

        // C1 * length + k20. C1*length must be 32-bit wrap.
        let v16 = Math.imul(5, (rol4((Math.imul(C1, length) + k20) >>> 0, 13) - MIX_SUB) >>> 0) >>> 0;

        let iterations = Math.floor((length - 1) / 20);
        let currOffset = 6; // data + 6

        while (iterations > 0) {
            iterations--;
            const a = mix_chunk(read32(data, currOffset - 6));
            const b = read32(data, currOffset - 2);
            const c = mix_chunk(read32(data, currOffset + 2));
            const d = mix_chunk(read32(data, currOffset + 6));
            const e = read32(data, currOffset + 10);

            // next_v14 = a - MIX_MUL1 * __ROL4__(b + v16, 13);
            const term = Math.imul(MIX_MUL1, rol4((b + v16) >>> 0, 13)) >>> 0;
            const next_v14 = (a - term) >>> 0;

            const t1 = rol4(v14 ^ a, 14);
            // (5 * (t1 - MIX_SUB)) ^ (b + d)
            const t2 = (Math.imul(5, (t1 - MIX_SUB) >>> 0) ^ ((b + d) >>> 0)) >>> 0;

            // byteswap32(5 * (e + __ROL4__(t2, 13) - MIX_SUB))
            const inner15 = Math.imul(5, (((e + rol4(t2, 13)) >>> 0) - MIX_SUB) >>> 0) >>> 0;
            const next_v15 = byteswap32(inner15);

            const t3 = rol4((v15 + c) >>> 0, 14);
            // 5 * byteswap32(e ^ (5 * (t3 - MIX_SUB)))
            const inner16 = (e ^ Math.imul(5, (t3 - MIX_SUB) >>> 0)) >>> 0;
            const next_v16 = Math.imul(5, byteswap32(inner16)) >>> 0;

            v14 = next_v14;
            v15 = next_v15;
            v16 = next_v16;
            currOffset += 20;
        }

        const final_mix = rol4(Math.imul(C1, ror4(v16, 11)), 15);
        
        // inner = v14 - MIX_MUL1 * __ROL4__(C1 * __ROR4__(v15, 11), 15);
        const term2 = Math.imul(MIX_MUL1, rol4(Math.imul(C1, ror4(v15, 11)), 15)) >>> 0;
        const inner = (v14 - term2) >>> 0;

        // final_h = 5 * __ROL4__(C1 * (final_mix + __ROL4__(5 * (__ROL4__(inner, 13) - MIX_SUB), 15)), 13) - MIX_SUB2;
        const inner2 = Math.imul(5, (rol4(inner, 13) - MIX_SUB) >>> 0) >>> 0;
        const inner3 = (final_mix + rol4(inner2, 15)) >>> 0;
        const inner4 = Math.imul(C1, inner3) >>> 0;
        const final_h = (Math.imul(5, rol4(inner4, 13)) - MIX_SUB2) >>> 0;

        return Math.imul(C1, rol4(final_h, 15)) >>> 0;
    }

    // 2. Medium input (13-24 bytes)
    if (length > 12) {
        return computeKamuiHash12To24(data);
    }

    // 3. Small input (5-12 bytes)
    if (length > 4) {
        const endOffset = length;
        
        // k_start = mix_chunk(length + read32(data));
        const k_start = mix_chunk((length + read32(data, 0)) >>> 0);
        // h = 5 * (__ROL4__((5 * length) ^ k_start, 13) - MIX_SUB);
        let h = Math.imul(5, (rol4(Math.imul(5, length) ^ k_start, 13) - MIX_SUB) >>> 0) >>> 0;

        // k_end = mix_chunk(5 * length + read32(end - 4));
        const k_end = mix_chunk((Math.imul(5, length) + read32(data, endOffset - 4)) >>> 0);
        // h = 5 * (__ROL4__(h ^ k_end, 13) - MIX_SUB);
        h = Math.imul(5, (rol4(h ^ k_end, 13) - MIX_SUB) >>> 0) >>> 0;

        // k_mid = C2 * __ROL4__(0x318F97D9 - MIX_MUL1 * read32(&data[(length >> 1) & 4]), 15);
        // (length >> 1) & 4 -> this index logic is a bit odd but based on C++ code
        // The index into data is actually `(length >> 1) & 4` which works out to 0 or 4.
        // wait, the C++ code is `&data[(length >> 1) & 4]`. This is data array offset.
        const midIdx = (length >> 1) & 4;
        const valRead = read32(data, midIdx);
        const valSub = (0x318F97D9 - Math.imul(MIX_MUL1, valRead)) >>> 0;
        const k_mid = Math.imul(C2, rol4(valSub, 15)) >>> 0;

        const v = rol4(h ^ k_mid, 13);
        
        // f = FMIX1 * ((5 * (v - MIX_SUB)) ^ ((5 * (v - MIX_SUB)) >> 16));
        const t = Math.imul(5, (v - MIX_SUB) >>> 0) >>> 0;
        const f = Math.imul(FMIX1, t ^ (t >>> 16)) >>> 0;

        // r = FMIX2 * (f ^ (f >> 13));
        const r = Math.imul(FMIX2, f ^ (f >>> 13)) >>> 0;
        return (r ^ (r >>> 16)) >>> 0;
    }

    // 4. Tiny input (<= 4 bytes)
    let acc = 0;
    let xorv = 9;

    for (let i = 0; i < length; ++i) {
        // acc = (int8)data[i] - MIX_MUL1 * acc;
        // (int8) cast is signed byte.
        let b = data[i];
        if (b > 127) b -= 256; // convert to signed
        acc = (b - Math.imul(MIX_MUL1, acc)) >>> 0;
        xorv = (xorv ^ acc) >>> 0;
    }

    // v = __ROL4__((5 * (__ROL4__(mix_chunk(length) ^ xorv, 13) - MIX_SUB)) ^ mix_chunk(acc), 13);
    const termA = rol4(mix_chunk(length) ^ xorv, 13);
    const termB = (Math.imul(5, (termA - MIX_SUB) >>> 0) >>> 0) ^ mix_chunk(acc);
    const v = rol4(termB, 13);
    
    // f = FMIX1 * ((5 * (v - MIX_SUB)) ^ ((5 * (v - MIX_SUB)) >> 16));
    const termC = Math.imul(5, (v - MIX_SUB) >>> 0) >>> 0;
    const f = Math.imul(FMIX1, termC ^ (termC >>> 16)) >>> 0;
    
    const r = Math.imul(FMIX2, f ^ (f >>> 13)) >>> 0;
    return (r ^ (r >>> 16)) >>> 0;
}

module.exports = { computeKamuiHash };

if (require.main === module) {
    const arg = process.argv[2];
    if (arg) {
        console.log("0x" + computeKamuiHash(arg).toString(16));
    }
}

