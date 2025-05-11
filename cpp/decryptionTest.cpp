#include <math.h>
#include <immintrin.h>
#include <stdint.h>
#include <iostream>
#include "game.h"

struct EncryptedValue
{
  uint64_t value;
  uint64_t key;
};

uintptr_t PLAYER_STRUCT_BASE = 0x9AB9928;
uintptr_t MOVESET_OFFSET = 0x3538;

uintptr_t getPlayerAddress(GameClass &game, int side)
{
  return game.getAddress({(DWORD)PLAYER_STRUCT_BASE, (DWORD)(0x30 + side * 8)});
}

uintptr_t getMovesetAddress(GameClass &game, uintptr_t playerAddr)
{
  return game.ReadUnsignedLong(playerAddr + MOVESET_OFFSET);
}

float NormalizeFloat(float base, float exponent);
__int64 Expand32To64WithChecksum(uint32_t inputValue, uint64_t key);
uint64_t Decrypt64BitValue(EncryptedValue *encrypted);

int main()
{
  struct EncryptedValue encrypted;
  // encrypted.value = 0x4562EE9CAC9562E1;
  // encrypted.key = 0x93D15236F563BCA5;
  encrypted.value = 0x6E81E7ECB3A64A04;
  encrypted.key = 0x8C49CBB96100E7B6;
  uint64_t result = Decrypt64BitValue(&encrypted);
  printf("Transformed value: 0x%.8x\n", result);
  return 0;

  // GameClass game;
  // if (game.Attach(L"Polaris-Win64-Shipping.exe"))
  // {
  //   uintptr_t DECRYPT_FUNC_ADDR = game.getBaseAddress() + 0x1800280;

  //   uintptr_t player = getPlayerAddress(game, 0);
  //   uintptr_t moveset = getMovesetAddress(game, player);

  //   uintptr_t start = game.ReadUnsignedLong(moveset + 0x230);
  //   uintptr_t count = game.ReadUnsignedLong(moveset + 0x238);

  //   for (uintptr_t i = 0; i < count; i++)
  //   {
  //     uintptr_t addr = start + i * 0x448;
  //     EncryptedValue encrypted = game.read<EncryptedValue>(addr + 0x58);
  //     uint64_t result = Decrypt64BitValue(&encrypted);

  //     uint32_t decrypted = game.callFunction<uint32_t, uintptr_t>(DECRYPT_FUNC_ADDR, (uintptr_t *)(addr + 0x58));

  //     bool match = result == decrypted;
  //     if (!match)
  //     {
  //       printf("%d = game: 0x%.8x, code: 0x%.8x\n", i, decrypted, result);
  //     }
  //   }
  // }
  printf("END!\n");
  return 0;
}

// Expands a 32-bit integer to 64-bit with checksum, using a 64-bit key.
__int64 Expand32To64WithChecksum(uint32_t inputValue, uint64_t key)
{
  uint32_t checksum = 0;
  uint32_t byteShift = 0;
  uint64_t shiftedInput = inputValue;

  while (byteShift < 32)
  {
    uint64_t tempKey = key;
    int shiftCount = static_cast<uint8_t>(byteShift + 8);

    while (shiftCount--)
    {
      tempKey = (tempKey >> 63) + 2 * tempKey; // Equivalent to a left shift with carry
    }

    checksum ^= static_cast<uint32_t>(shiftedInput) ^ static_cast<uint32_t>(tempKey);
    shiftedInput >>= 8;
    byteShift += 8;
  }

  return inputValue + ((checksum ? checksum : 1ull) << 32);
}

// Validates a 64-bit encrypted value and transforms it using a custom key-based algorithm.
uint64_t Decrypt64BitValue(EncryptedValue *encrypted)
{
  uint64_t key = encrypted->key;
  uint64_t encryptedValue = encrypted->value;

  // Validate the 64-bit value using the checksum function
  if (Expand32To64WithChecksum(static_cast<uint32_t>(encryptedValue), key) != encryptedValue)
    return 0;

  // Scramble the value with a fixed XOR and calculate an offset
  uint64_t scrambledValue = encryptedValue ^ 0x1D;
  int bitOffset = scrambledValue & 0x1F;

  // Rotate the key left by bitOffset
  while (bitOffset--)
  {
    key = (key >> 63) + 2 * key;
  }

  // Normalize with float math
  float normalizer = 4294967296.0f; // 2^32
  uint64_t scaleOffset = 0;
  if (normalizer >= 9223372036854775800.0f)
  {
    normalizer -= 9223372036854775800.0f;
    if (normalizer < 9223372036854775800.0f)
      scaleOffset = 0x8000000000000000;
  }

  key &= 0xFFFFFFFFFFFFFFE0; // Clear lower 5 bits
  key ^= scrambledValue;
  key <<= 32;

  uint64_t divisor = scaleOffset + static_cast<uint64_t>(normalizer);
  return key / divisor;
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
