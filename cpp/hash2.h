#include <string>

/*============================================================
  Basic integer typedefs
============================================================*/
typedef long long ll;
typedef unsigned long long ull;

typedef unsigned int uint;
typedef unsigned char uchar;
typedef unsigned short ushort;
typedef unsigned long ulong;

typedef char int8;
typedef signed char sint8;
typedef unsigned char uint8;
typedef short int16;
typedef signed short sint16;
typedef unsigned short uint16;
typedef int int32;
typedef signed int sint32;
typedef unsigned int uint32;
typedef ll int64;
typedef ll sint64;
typedef ull uint64;

/*============================================================
  Helper macros
============================================================*/
#define _WORD uint16
#define _DWORD uint32

#define LAST_IND(x, part_type) (sizeof(x) / sizeof(part_type) - 1)
#define HIGH_IND(x, part_type) LAST_IND(x, part_type)
#define LOW_IND(x, part_type) 0

#define WORDn(x, n) (*((_WORD *)&(x) + (n)))
#define DWORDn(x, n) (*((_DWORD *)&(x) + (n)))

#define LODWORD(x) DWORDn(x, LOW_IND(x, _DWORD))
#define HIWORD(x) WORDn(x, HIGH_IND(x, _WORD))

/*============================================================
  Helpers
============================================================*/
template <class T> T __ROL__(T value, int count) {
  const uint nbits = sizeof(T) * 8;

  if (count > 0) {
    count %= nbits;
    T high = value >> (nbits - count);
    if (T(-1) < 0) { // signed
      high &= ~((T(-1) << count));
    }
    value <<= count;
    value |= high;
  } else {
    count = (-count) % nbits;
    T low = value << (nbits - count);
    value >>= count;
    value |= low;
  }
  return value;
}

inline uint8 __ROL1__(uint8 v, int c) { return __ROL__((uint8)v, c); }
inline uint16 __ROL2__(uint16 v, int c) { return __ROL__((uint16)v, c); }
inline uint32 __ROL4__(uint32 v, int c) { return __ROL__((uint32)v, c); }
inline uint64 __ROL8__(uint64 v, int c) { return __ROL__((uint64)v, c); }

inline uint8 __ROR1__(uint8 v, int c) { return __ROL__((uint8)v, -c); }
inline uint16 __ROR2__(uint16 v, int c) { return __ROL__((uint16)v, -c); }
inline uint32 __ROR4__(uint32 v, int c) { return __ROL__((uint32)v, -c); }
inline uint64 __ROR8__(uint64 v, int c) { return __ROL__((uint64)v, -c); }

inline uint32 read32(uint8 *p) {
  return *(p) | ((p[1] | (*((uint16 *)p + 1) << 8)) << 8);
}

inline uint32 byteswap32(uint32 v) {
  return ((v >> 24) & 0x000000FF) | ((v >> 8) & 0x0000FF00) |
         ((v << 8) & 0x00FF0000) | ((v << 24) & 0xFF000000);
}

/*============================================================
  Murmur-style constants (centralized)
============================================================*/
static constexpr uint32 C1 = 0xCC9E2D51;
static constexpr uint32 C2 = 0x1B873593;

static constexpr uint32 MIX_SUB = 0x052250EC;
static constexpr uint32 MIX_SUB2 = 0x19AB949C;
static constexpr uint32 MIX_MUL1 = 0x3361D2AF;

static constexpr uint32 FMIX1 = 0x85EBCA6B;
static constexpr uint32 FMIX2 = 0xC2B2AE35;

/*============================================================
  Forward declaration
============================================================*/
int64 ComputeKamuiHash12To24(uint8 *data, uint32 length);

/*============================================================
  Core hash
============================================================*/
int64 ComputeKamuiHash(uint8 *data, uint64 length) {

  auto mix_chunk = [](uint32 k) {
    k *= C1;
    k = __ROL4__(k, 15);
    k *= C2;
    return k;
  };

  /*--------------------------
    Long input (> 24 bytes)
  --------------------------*/
  if (length > 24) {
    uint32 k4 = mix_chunk(read32(data + length - 4));
    uint32 k8 = mix_chunk(read32(data + length - 8));
    uint32 k12 = mix_chunk(read32(data + length - 12));
    uint32 k16 = mix_chunk(read32(data + length - 16));
    uint32 k20 = mix_chunk(read32(data + length - 20));

    uint32 h1 = 5 * (__ROL4__(length ^ k4, 13) - MIX_SUB);
    uint32 v14 = 5 * (__ROL4__(k16 ^ h1, 13) - MIX_SUB);

    uint32 h2 = 5 * (__ROL4__((C1 * length) ^ k8, 13) - MIX_SUB);
    uint32 v15 = 5 * (__ROL4__(k12 ^ h2, 13) - MIX_SUB);

    uint32 v16 = 5 * (__ROL4__(C1 * length + k20, 13) - MIX_SUB);

    uint64 iterations = (length - 1) / 20;
    uint8 *curr = data + 6;

    while (iterations--) {
      uint32 a = mix_chunk(read32(curr - 6));
      uint32 b = read32(curr - 2);
      uint32 c = mix_chunk(read32(curr + 2));
      uint32 d = mix_chunk(read32(curr + 6));
      uint32 e = read32(curr + 10);

      uint32 next_v14 = a - MIX_MUL1 * __ROL4__(b + v16, 13);

      uint32 t1 = __ROL4__(v14 ^ a, 14);
      uint32 t2 = (5 * (t1 - MIX_SUB)) ^ (b + d);

      uint32 next_v15 = byteswap32(5 * (e + __ROL4__(t2, 13) - MIX_SUB));

      uint32 t3 = __ROL4__(v15 + c, 14);
      uint32 next_v16 = 5 * byteswap32(e ^ (5 * (t3 - MIX_SUB)));

      v14 = next_v14;
      v15 = next_v15;
      v16 = next_v16;
      curr += 20;
    }

    uint32 final_mix = __ROL4__(C1 * __ROR4__(v16, 11), 15);

    uint32 inner = v14 - MIX_MUL1 * __ROL4__(C1 * __ROR4__(v15, 11), 15);

    uint32 final_h =
        5 * __ROL4__(C1 * (final_mix +
                           __ROL4__(5 * (__ROL4__(inner, 13) - MIX_SUB), 15)),
                     13) -
        MIX_SUB2;

    return C1 * __ROL4__(final_h, 15);
  }

  /*--------------------------
    Medium input (13–24)
  --------------------------*/
  if (length > 12) {
    return ComputeKamuiHash12To24(data, (uint32)length);
  }

  /*--------------------------
    Small input (5–12)
  --------------------------*/
  if (length > 4) {
    uint8 *end = data + length;

    uint32 k_start = mix_chunk(length + read32(data));
    uint32 h = 5 * (__ROL4__((5 * length) ^ k_start, 13) - MIX_SUB);

    uint32 k_end = mix_chunk(5 * length + read32(end - 4));
    h = 5 * (__ROL4__(h ^ k_end, 13) - MIX_SUB);

    uint32 k_mid =
        C2 *
        __ROL4__(0x318F97D9 - MIX_MUL1 * read32(&data[(length >> 1) & 4]), 15);

    uint32 v = __ROL4__(h ^ k_mid, 13);

    uint32 f = FMIX1 * ((5 * (v - MIX_SUB)) ^ ((5 * (v - MIX_SUB)) >> 16));

    uint32 r = FMIX2 * (f ^ (f >> 13));
    return r ^ (r >> 16);
  }

  /*--------------------------
    Tiny input (≤ 4)
  --------------------------*/
  uint32 acc = 0;
  uint32 xorv = 9;

  for (uint32 i = 0; i < length; ++i) {
    acc = (int8)data[i] - MIX_MUL1 * acc;
    xorv ^= acc;
  }

  uint32 v = __ROL4__((5 * (__ROL4__(mix_chunk(length) ^ xorv, 13) - MIX_SUB)) ^
                          mix_chunk(acc),
                      13);

  uint32 f = FMIX1 * ((5 * (v - MIX_SUB)) ^ ((5 * (v - MIX_SUB)) >> 16));

  uint32 r = FMIX2 * (f ^ (f >> 13));
  return r ^ (r >> 16);
}

/*============================================================
  12–24 byte specialization
============================================================*/
int64 ComputeKamuiHash12To24(uint8 *data, uint32 length) {

  auto mix_chunk = [](uint32 k) {
    k *= C1;
    k = __ROL4__(k, 15);
    k *= C2;
    return k;
  };

  uint8 *end = data + length;
  uint8 *mid = data + (length >> 1);

  uint32 k1 = mix_chunk(read32(end - 4));
  uint32 k2 = mix_chunk(read32(data));
  uint32 k3 = mix_chunk(read32(mid));
  uint32 k4 = mix_chunk(read32(end - 8));
  uint32 k5 = mix_chunk(read32(data + 4));
  uint32 k6 = mix_chunk(read32(mid - 4));

  uint32 h = length;

  h ^= k6;
  h = 5 * (__ROL4__(h, 13) - MIX_SUB);
  h ^= k5;
  h = 5 * __ROL4__(h, 13) - MIX_SUB2;
  h ^= k4;
  h = 5 * (__ROL4__(h, 13) - MIX_SUB);
  h ^= k3;
  h = 5 * __ROL4__(h, 13) - MIX_SUB2;
  h ^= k2;
  h = 5 * (__ROL4__(h, 13) - MIX_SUB);
  h ^= k1;
  h = __ROL4__(h, 13);

  uint32 f = 5 * (h - MIX_SUB);
  f ^= (f >> 16);
  f *= FMIX1;
  f ^= (f >> 13);
  f *= FMIX2;

  return f ^ HIWORD(f);
}

/*============================================================
  String helpers
============================================================*/
int64 ComputeKamuiStringHash(const char *str, uint64 length) {
  return ComputeKamuiHash((uint8 *)str, length);
}

int64 ComputeKamuiStringHash(const std::string &str, uint64 length) {
  return ComputeKamuiHash((uint8 *)str.c_str(), length);
}
