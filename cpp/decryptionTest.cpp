#include <math.h>
#include <immintrin.h>
#include <stdint.h>
#include <iostream>
#include "tk_encryption.h"

int main()
{
  // uint32_t value = 0x06c60ba2;
  // printf("TK__decrypt20BitWith12BitChecksum: 0x%.8x\n", TK__decrypt20BitWith12BitChecksum(value));
  // printf("TK__decrypt24BitWith8BitChecksum: 0x%.8x\n", TK__decrypt24BitWith8BitChecksum(value));
  // printf("TK__decrypt26BitWith6BitChecksum: 0x%.8x\n", TK__decrypt26BitWith6BitChecksum(value));
  // printf("TK__decrypt28BitWith4BitChecksum: 0x%.8x\n", TK__decrypt28BitWith4BitChecksum(value));
  // printf("TK__decrypt32BitWith32BitChecksum: 0x%.16llx\n", TK__decrypt32BitWith32BitChecksum(value));
  printf("0x%.8x\n", TK__decrypt32BitWith32BitChecksumUsingKey(0x930F5C0AF34EF6B2u, 0x29C16F74AD13CA90u));
}

/**
 * Normalizes a floating-point value based on special cases.
 *
 * @param base The base value to normalize.
 * @param exponent The exponent or scaling factor.
 * @return The normalized result (could be INFINITY, 1.0, or a computed value).
 */
float NormalizeFloat(float base, float exponent)
{
  __m128 exponent_vec = _mm_set_ss(exponent);
  float result = 0.0f;

  // Early exits for common cases
  if (base == 1.0f)
  {
    return 1.0f;
  }
  if (exponent == 0.0f)
  {
    return 1.0f;
  }

  // Handle zero base
  if (base == 0.0f)
  {
    if (exponent < 0.0f)
    {
      result = INFINITY;
    }

    // Adjust sign if needed
    if (signbit(base) && !isnan(exponent))
    {
      float adjusted_exponent = (exponent + 1.0f) * 0.5f;
      int int_part = (int)adjusted_exponent;

      // Handle floating-point rounding
      if (int_part != 0x80000000 && (float)int_part != adjusted_exponent)
      {
        int_part -= (_mm_movemask_ps(_mm_unpacklo_ps(exponent_vec, exponent_vec)) & 1);
      }

      if (adjusted_exponent == (float)int_part)
      {
        result = copysignf(result, -1.0f);
      }
    }
    return result;
  }

  // Handle infinity/NaN cases
  if (isinf(base) || isnan(base))
  {
    if (exponent >= 0.0f)
    {
      result = INFINITY;
    }
    else
    {
      result = 0.0f;
    }

    // Adjust sign if needed
    if (base < 0.0f && !isnan(exponent))
    {
      float adjusted_exponent = (exponent + 1.0f) * 0.5f;
      int int_part = (int)adjusted_exponent;

      // Handle floating-point rounding
      if (int_part != 0x80000000 && (float)int_part != adjusted_exponent)
      {
        int_part -= (_mm_movemask_ps(_mm_unpacklo_ps(exponent_vec, exponent_vec)) & 1);
      }

      if (adjusted_exponent == (float)int_part)
      {
        result = copysignf(result, -1.0f);
      }
    }
    return result;
  }

  // Default case: compute power (base^exponent)
  return powf(base, exponent);
}
