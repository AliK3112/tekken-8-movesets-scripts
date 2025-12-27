// #include "hexrays.h"
// #include <cstdint>
#include <string>

#ifndef HASH_TYPES_H
#define HASH_TYPES_H

// Basic integer type aliases
typedef          long long ll;
typedef unsigned long long ull;

typedef unsigned int   uint;
typedef unsigned char  uchar;
typedef unsigned short ushort;
typedef unsigned long  ulong;

// Fixed-width integer type aliases
typedef          char   int8;
typedef   signed char   sint8;
typedef unsigned char   uint8;
typedef          short  int16;
typedef   signed short  sint16;
typedef unsigned short  uint16;
typedef          int    int32;
typedef   signed int    sint32;
typedef unsigned int    uint32;
typedef ll              int64;
typedef ll              sint64;
typedef ull             uint64;

// Word definitions
#define _WORD  uint16
#define _DWORD uint32

#endif // HASH_TYPES_H

#define LAST_IND(x,part_type)    (sizeof(x)/sizeof(part_type) - 1)
#define HIGH_IND(x,part_type)  LAST_IND(x,part_type)
#define LOW_IND(x,part_type)   0

#define WORDn(x, n)   (*((_WORD*)&(x)+n))
#define DWORDn(x, n)  (*((_DWORD*)&(x)+n))

#define LODWORD(x) DWORDn(x,LOW_IND(x,_DWORD))
#define HIWORD(x)  WORDn(x,HIGH_IND(x,_WORD))

// rotate left
template<class T> T __ROL__(T value, int count)
{
  const uint nbits = sizeof(T) * 8;

  if ( count > 0 )
  {
    count %= nbits;
    T high = value >> (nbits - count);
    if ( T(-1) < 0 ) // signed value
      high &= ~((T(-1) << count));
    value <<= count;
    value |= high;
  }
  else
  {
    count = -count % nbits;
    T low = value << (nbits - count);
    value >>= count;
    value |= low;
  }
  return value;
}

inline uint8  __ROL1__(uint8  value, int count) { return __ROL__((uint8)value, count); }
inline uint16 __ROL2__(uint16 value, int count) { return __ROL__((uint16)value, count); }
inline uint32 __ROL4__(uint32 value, int count) { return __ROL__((uint32)value, count); }
inline uint64 __ROL8__(uint64 value, int count) { return __ROL__((uint64)value, count); }
inline uint8  __ROR1__(uint8  value, int count) { return __ROL__((uint8)value, -count); }
inline uint16 __ROR2__(uint16 value, int count) { return __ROL__((uint16)value, -count); }
inline uint32 __ROR4__(uint32 value, int count) { return __ROL__((uint32)value, -count); }
inline uint64 __ROR8__(uint64 value, int count) { return __ROL__((uint64)value, -count); }


// inline uint32 _byteswap_ulong(uint32 value)
// {
//   return ((value >> 24) & 0x000000FF) | // Move byte 0 to byte 3
//          ((value >> 8) & 0x0000FF00) |  // Move byte 1 to byte 2
//          ((value << 8) & 0x00FF0000) |  // Move byte 2 to byte 1
//          ((value << 24) & 0xFF000000);  // Move byte 3 to byte 0
// }

int64 ComputeKamuiHash12To24(uint8 *a1, uint32 length);

int64 ComputeKamuiHash(uint8 *a1, uint64 length)
{
  int v2;       // ebx
  uint8 *v3;  // r11
  int v4;       // eax
  int v5;       // r8d
  int v6;       // ecx
  int v7;       // eax
  int v8;       // eax
  uint32 v9;  // eax
  uint8 *v11; // r8
  int v12;      // eax
  uint32 v13; // eax
  int v14;      // esi
  int v15;      // ebp
  int v16;      // edi
  uint64 v17; // rbx
  uint8 *v18; // r11
  int v19;      // r10d
  int v20;      // edx
  int v21;      // r8d
  int v22;      // r9d
  int v23;      // r10d
  uint32 v24; // edx
  int v25;      // eax

  v2 = length;
  v3 = a1;
  if (length > 24)
  {
    v14 =
        5 *
        (__ROL4__(
             (0x1B873593 *
              __ROL4__(
                  0xCC9E2D51 *
                      (a1[length - 16] |
                       ((a1[length - 15] | (*(uint16 *)&a1[length - 14] << 8))
                        << 8)),
                  15)) ^
                 (5 *
                  (__ROL4__(
                       length ^
                           (0x1B873593 *
                            __ROL4__(0xCC9E2D51 *
                                         (a1[length - 4] |
                                          ((a1[length - 3] |
                                            (*(uint16 *)&a1[length - 2] << 8))
                                           << 8)),
                                     15)),
                       13) -
                   0x52250EC)),
             13) -
         0x52250EC);
    v15 =
        5 *
        (__ROL4__(
             (0x1B873593 *
              __ROL4__(
                  0xCC9E2D51 *
                      (a1[length - 12] |
                       ((a1[length - 11] | (*(uint16 *)&a1[length - 10] << 8))
                        << 8)),
                  15)) ^
                 (5 *
                  (__ROL4__(
                       (0xCC9E2D51 * length) ^
                           (461845907 *
                            __ROL4__(0xCC9E2D51 *
                                         (a1[length - 8] |
                                          ((a1[length - 7] |
                                            (*(uint16 *)&a1[length - 6] << 8))
                                           << 8)),
                                     15)),
                       13) -
                   0x52250EC)),
             13) -
         0x52250EC);
    v16 =
        5 *
        (__ROL4__(0xCC9E2D51 * length +
                      461845907 *
                          __ROL4__(0xCC9E2D51 *
                                       (a1[length - 20] |
                                        ((a1[length - 19] |
                                          (*(uint16 *)&a1[length - 18] << 8))
                                         << 8)),
                                   15),
                  13) -
         0x52250EC);
    v17 = (length - 1) / 20;
    v18 = a1 + 6;
    do
    {
      v19 = 0x1B873593 *
            __ROL4__(0xCC9E2D51 *
                         (*(v18 - 6) |
                          ((*(v18 - 5) | (*((uint16 *)v18 - 2) << 8)) << 8)),
                     15);
      v20 = *(v18 - 2) | ((*(v18 - 1) | (*(uint16 *)v18 << 8)) << 8);
      v21 = __ROL4__(v14 ^ v19, 14);
      v22 = v18[10] | ((v18[11] | (*((uint16 *)v18 + 6) << 8)) << 8);
      v23 = v19 - 0x3361D2AF * __ROL4__(v20 + v16, 13);
      v14 = v23;
      v24 = _byteswap_ulong(
          5 *
          (v22 +
           __ROL4__(
               (5 * (v21 - 0x52250EC)) ^
                   (v20 +
                    0x1B873593 *
                        __ROL4__(0xCC9E2D51 *
                                     (v18[6] |
                                      ((v18[7] | (*((uint16 *)v18 + 4) << 8))
                                       << 8)),
                                 15)),
               13) -
           0x52250EC));
      v25 = __ROL4__(
          v15 + 0x1B873593 *
                    __ROL4__(
                        0xCC9E2D51 *
                            (v18[2] |
                             ((v18[3] | (*((uint16 *)v18 + 2) << 8)) << 8)),
                        15),
          14);
      v18 += 20;
      v15 = v24;
      v16 = 5 * _byteswap_ulong(v22 ^ (5 * (v25 - 0x52250EC)));
      // ORIGINAL DECOMPILED LINE
      LODWORD(v17) = v17 - 1;
      // v17 = (static_cast<uint64>(_HIWORD(v17)) << 32) | (LODWORD(v17) - 1);
    } while ((uint32)v17);
    return 0xCC9E2D51 *
           __ROL4__(
               5 * __ROL4__(
                       0xCC9E2D51 *
                           (__ROL4__(0xCC9E2D51 * __ROR4__(v16, 11), 15) +
                            __ROL4__(
                                5 * (__ROL4__(
                                         v23 -
                                             0x3361D2AF *
                                                 __ROL4__(0xCC9E2D51 *
                                                              __ROR4__(v24, 11),
                                                          15),
                                         13) -
                                     0x52250EC),
                                15)),
                       13) -
                   0x19AB949C,
               15);
  }
  else if (length > 12)
  {
    return ComputeKamuiHash12To24(a1, length);
  }
  else if (length > 4)
  {
    v11 = &a1[(uint32)length];
    v12 = __ROL4__(
        (5 *
         (__ROL4__(
              (5 *
               (__ROL4__(
                    (5 * length) ^
                        (0x1B873593 *
                         __ROL4__(0xCC9E2D51 *
                                      (length +
                                       (*a1 |
                                        ((a1[1] | ((a1[2] | (a1[3] << 8)) << 8))
                                         << 8))),
                                  15)),
                    13) -
                0x52250EC)) ^
                  (0x1B873593 *
                   __ROL4__(0xCC9E2D51 *
                                (5 * length +
                                 (*(v11 - 4) |
                                  ((*(v11 - 3) | (*((uint16 *)v11 - 1) << 8))
                                   << 8))),
                            15)),
              13) -
          0x52250EC)) ^
            (0x1B873593 *
             __ROL4__(
                 0x318F97D9 -
                     0x3361D2AF *
                         (a1[((uint32)length >> 1) & 4] |
                          ((a1[(((uint32)length >> 1) & 4) + 1] |
                            (*(uint16 *)&a1[(((uint32)length >> 1) & 4) + 2]
                             << 8))
                           << 8)),
                 15)),
        13);
    v13 = 0x85EBCA6B *
          ((5 * (v12 - 0x52250EC)) ^ ((uint32)(5 * (v12 - 0x52250EC)) >> 16));
    return (0xC2B2AE35 * (v13 ^ (v13 >> 13))) ^
           ((0xC2B2AE35 * (v13 ^ (v13 >> 13))) >> 16);
  }
  else
  {
    v4 = 0;
    v5 = 9;
    if ((uint32)length)
    {
      length = (uint32)length;
      do
      {
        v6 = 0x3361D2AF * v4;
        v7 = (char)*v3++;
        v4 = v7 - v6;
        v5 ^= v4;
        --length;
      } while (length);
    }
    v8 = __ROL4__(
        (5 * (__ROL4__((0x1B873593 * __ROL4__(0xCC9E2D51 * v2, 15)) ^ v5, 13) -
              0x52250EC)) ^
            (0x1B873593 * __ROL4__(0xCC9E2D51 * v4, 15)),
        13);
    v9 = 0x85EBCA6B *
         ((5 * (v8 - 0x52250EC)) ^ ((uint32)(5 * (v8 - 0x52250EC)) >> 16));
    return (0xC2B2AE35 * (v9 ^ (v9 >> 13))) ^
           ((0xC2B2AE35 * (v9 ^ (v9 >> 13))) >> 16);
  }
}

int64 ComputeKamuiHash12To24(uint8 *a1,
                               uint32 length)
{
  uint8 *v2; // r11
  uint8 *v3; // r9
  int v4;      // edx
  uint32 v5; // edx

  v2 = &a1[length];
  v3 = &a1[(uint64)length >> 1];
  v4 = __ROL4__(
      (0x1B873593 *
       __ROL4__(
           0xCC9E2D51 *
               (*(v2 - 4) | ((*(v2 - 3) | (*((uint16 *)v2 - 1) << 8)) << 8)),
           15)) ^
          (5 *
           (__ROL4__(
                (0x1B873593 *
                 __ROL4__(
                     0xCC9E2D51 *
                         (*a1 | ((a1[1] | (*((uint16 *)a1 + 1) << 8)) << 8)),
                     15)) ^
                    (5 * __ROL4__(
                             (0x1B873593 *
                              __ROL4__(
                                  0xCC9E2D51 *
                                      (*v3 |
                                       ((v3[1] | (*((uint16 *)v3 + 1) << 8))
                                        << 8)),
                                  15)) ^
                                 (5 *
                                  (__ROL4__(
                                       (0x1B873593 *
                                        __ROL4__(
                                            0xCC9E2D51 *
                                                (*(v2 - 8) |
                                                 ((*(v2 - 7) |
                                                   (*((uint16 *)v2 - 3) << 8))
                                                  << 8)),
                                            15)) ^
                                           (5 * __ROL4__(
                                                    (0x1B873593 *
                                                     __ROL4__(
                                                         0xCC9E2D51 *
                                                             (a1[4] |
                                                              ((a1[5] |
                                                                (*((uint16 *)
                                                                       a1 +
                                                                   3)
                                                                 << 8))
                                                               << 8)),
                                                         15)) ^
                                                        (5 *
                                                         (__ROL4__(
                                                              length ^
                                                                  (0x1B873593 *
                                                                   __ROL4__(
                                                                       0xCC9E2D51 *
                                                                           (a1[(length >>
                                                                                1) -
                                                                               4] |
                                                                            ((a1[(length >>
                                                                                  1) -
                                                                                 3] |
                                                                              (*(uint16
                                                                                     *)&a1
                                                                                   [(length >>
                                                                                     1) -
                                                                                    2]
                                                                               << 8))
                                                                             << 8)),
                                                                       15)),
                                                              13) -
                                                          0x52250EC)),
                                                    13) -
                                            0x19AB949C),
                                       13) -
                                   0x52250EC)),
                             13) -
                     0x19AB949C),
                13) -
            0x52250EC)),
      13);
  v5 = 0xC2B2AE35 *
       ((0x85EBCA6B *
         ((5 * (v4 - 0x52250EC)) ^ ((uint32)(5 * (v4 - 0x52250EC)) >> 16))) ^
        ((0x85EBCA6B * ((5 * (v4 - 0x52250EC)) ^
                        ((uint32)(5 * (v4 - 0x52250EC)) >> 16))) >>
         13));
  return v5 ^ HIWORD(v5);
}

int64 ComputeKamuiStringHash(const char *a1, uint64 length) {
  return ComputeKamuiHash((uint8*)a1, length);
};

int64 ComputeKamuiStringHash(std::string a1, uint64 length) {
  return ComputeKamuiHash((uint8 *)a1.c_str(), length);
};
