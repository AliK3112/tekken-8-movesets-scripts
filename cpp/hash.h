#include "hexrays.h"

// inline uint32_t __ROL4__(uint32_t value, uint8_t shift)
// {
//   return (value << shift) | (value >> (32 - shift));
// }

// inline uint32_t __ROR4__(uint32_t value, uint8_t shift)
// {
//   return (value >> shift) | (value << (32 - shift));
// }

// inline uint32_t _byteswap_ulong(uint32_t value)
// {
//   return ((value >> 24) & 0x000000FF) | // Move byte 0 to byte 3
//          ((value >> 8) & 0x0000FF00) |  // Move byte 1 to byte 2
//          ((value << 8) & 0x00FF0000) |  // Move byte 2 to byte 1
//          ((value << 24) & 0xFF000000);  // Move byte 3 to byte 0
// }

// inline uint32_t _LODWORD(uint64_t value)
// {
//   return static_cast<uint32_t>(value & 0xFFFFFFFF); // Mask the lower 32 bits
// }

// inline uint32_t _HIWORD(uint64_t value)
// {
//   return static_cast<uint32_t>(
//       value >> 32); // Shift right by 32 bits to get the upper 32 bits
// }

int64_t ComputeKamuiHash12To24(uint8_t *a1, uint32_t length);

int64_t ComputeKamuiHash(uint8_t *a1, uint64_t length)
{
  int v2;       // ebx
  uint8_t *v3;  // r11
  int v4;       // eax
  int v5;       // r8d
  int v6;       // ecx
  int v7;       // eax
  int v8;       // eax
  uint32_t v9;  // eax
  uint8_t *v11; // r8
  int v12;      // eax
  uint32_t v13; // eax
  int v14;      // esi
  int v15;      // ebp
  int v16;      // edi
  uint64_t v17; // rbx
  uint8_t *v18; // r11
  int v19;      // r10d
  int v20;      // edx
  int v21;      // r8d
  int v22;      // r9d
  int v23;      // r10d
  uint32_t v24; // edx
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
                       ((a1[length - 15] | (*(uint16_t *)&a1[length - 14] << 8))
                        << 8)),
                  15)) ^
                 (5 *
                  (__ROL4__(
                       length ^
                           (0x1B873593 *
                            __ROL4__(0xCC9E2D51 *
                                         (a1[length - 4] |
                                          ((a1[length - 3] |
                                            (*(uint16_t *)&a1[length - 2] << 8))
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
                       ((a1[length - 11] | (*(uint16_t *)&a1[length - 10] << 8))
                        << 8)),
                  15)) ^
                 (5 *
                  (__ROL4__(
                       (0xCC9E2D51 * length) ^
                           (461845907 *
                            __ROL4__(0xCC9E2D51 *
                                         (a1[length - 8] |
                                          ((a1[length - 7] |
                                            (*(uint16_t *)&a1[length - 6] << 8))
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
                                          (*(uint16_t *)&a1[length - 18] << 8))
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
                          ((*(v18 - 5) | (*((uint16_t *)v18 - 2) << 8)) << 8)),
                     15);
      v20 = *(v18 - 2) | ((*(v18 - 1) | (*(uint16_t *)v18 << 8)) << 8);
      v21 = __ROL4__(v14 ^ v19, 14);
      v22 = v18[10] | ((v18[11] | (*((uint16_t *)v18 + 6) << 8)) << 8);
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
                                      ((v18[7] | (*((uint16_t *)v18 + 4) << 8))
                                       << 8)),
                                 15)),
               13) -
           0x52250EC));
      v25 = __ROL4__(
          v15 + 0x1B873593 *
                    __ROL4__(
                        0xCC9E2D51 *
                            (v18[2] |
                             ((v18[3] | (*((uint16_t *)v18 + 2) << 8)) << 8)),
                        15),
          14);
      v18 += 20;
      v15 = v24;
      v16 = 5 * _byteswap_ulong(v22 ^ (5 * (v25 - 0x52250EC)));
      // ORIGINAL DECOMPILED LINE
      LODWORD(v17) = v17 - 1;
      // v17 = (static_cast<uint64_t>(_HIWORD(v17)) << 32) | (LODWORD(v17) - 1);
    } while ((uint32_t)v17);
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
    v11 = &a1[(uint32_t)length];
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
                                  ((*(v11 - 3) | (*((uint16_t *)v11 - 1) << 8))
                                   << 8))),
                            15)),
              13) -
          0x52250EC)) ^
            (0x1B873593 *
             __ROL4__(
                 0x318F97D9 -
                     0x3361D2AF *
                         (a1[((uint32_t)length >> 1) & 4] |
                          ((a1[(((uint32_t)length >> 1) & 4) + 1] |
                            (*(uint16_t *)&a1[(((uint32_t)length >> 1) & 4) + 2]
                             << 8))
                           << 8)),
                 15)),
        13);
    v13 = 0x85EBCA6B *
          ((5 * (v12 - 0x52250EC)) ^ ((uint32_t)(5 * (v12 - 0x52250EC)) >> 16));
    return (0xC2B2AE35 * (v13 ^ (v13 >> 13))) ^
           ((0xC2B2AE35 * (v13 ^ (v13 >> 13))) >> 16);
  }
  else
  {
    v4 = 0;
    v5 = 9;
    if ((uint32_t)length)
    {
      length = (uint32_t)length;
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
         ((5 * (v8 - 0x52250EC)) ^ ((uint32_t)(5 * (v8 - 0x52250EC)) >> 16));
    return (0xC2B2AE35 * (v9 ^ (v9 >> 13))) ^
           ((0xC2B2AE35 * (v9 ^ (v9 >> 13))) >> 16);
  }
}

int64_t ComputeKamuiHash12To24(uint8_t *a1,
                               uint32_t length)
{
  uint8_t *v2; // r11
  uint8_t *v3; // r9
  int v4;      // edx
  uint32_t v5; // edx

  v2 = &a1[length];
  v3 = &a1[(uint64_t)length >> 1];
  v4 = __ROL4__(
      (0x1B873593 *
       __ROL4__(
           0xCC9E2D51 *
               (*(v2 - 4) | ((*(v2 - 3) | (*((uint16_t *)v2 - 1) << 8)) << 8)),
           15)) ^
          (5 *
           (__ROL4__(
                (0x1B873593 *
                 __ROL4__(
                     0xCC9E2D51 *
                         (*a1 | ((a1[1] | (*((uint16_t *)a1 + 1) << 8)) << 8)),
                     15)) ^
                    (5 * __ROL4__(
                             (0x1B873593 *
                              __ROL4__(
                                  0xCC9E2D51 *
                                      (*v3 |
                                       ((v3[1] | (*((uint16_t *)v3 + 1) << 8))
                                        << 8)),
                                  15)) ^
                                 (5 *
                                  (__ROL4__(
                                       (0x1B873593 *
                                        __ROL4__(
                                            0xCC9E2D51 *
                                                (*(v2 - 8) |
                                                 ((*(v2 - 7) |
                                                   (*((uint16_t *)v2 - 3) << 8))
                                                  << 8)),
                                            15)) ^
                                           (5 * __ROL4__(
                                                    (0x1B873593 *
                                                     __ROL4__(
                                                         0xCC9E2D51 *
                                                             (a1[4] |
                                                              ((a1[5] |
                                                                (*((uint16_t *)
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
                                                                              (*(uint16_t
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
         ((5 * (v4 - 0x52250EC)) ^ ((uint32_t)(5 * (v4 - 0x52250EC)) >> 16))) ^
        ((0x85EBCA6B * ((5 * (v4 - 0x52250EC)) ^
                        ((uint32_t)(5 * (v4 - 0x52250EC)) >> 16))) >>
         13));
  return v5 ^ HIWORD(v5);
}
