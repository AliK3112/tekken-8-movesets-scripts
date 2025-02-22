#include <iostream>

typedef unsigned char uint8_t;
typedef unsigned int uint32_t;
typedef unsigned long long uint64_t;

uint32_t encryptOriginalValue(uint32_t originalValue)
{
  uint64_t seed = 0xEDCCFB96DCA40FBA;
  if ((originalValue & 0x1F) != 0)
  {
    uint32_t shiftAmount = originalValue & 0x1F;
    do
    {
      seed = (seed >> 63) + 2 * seed;
      --shiftAmount;
    } while (shiftAmount);
  }

  uint32_t bitOffset = 0;
  uint32_t maskedValue = (originalValue ^ seed & 0xFFFFFFE0 ^ 0x1D) & 0xFFFFFFF;
  uint32_t tempValue = maskedValue;
  char xorAccumulator = 0;

  do
  {
    uint64_t tempSeed = 0xEDCCFB96DCA40FBA;
    uint32_t shiftBits = (uint8_t)(bitOffset + 4);
    do
    {
      tempSeed = (tempSeed >> 63) + 2 * tempSeed;
      --shiftBits;
    } while (shiftBits);

    bitOffset += 4;
    xorAccumulator ^= tempValue ^ tempSeed;
    tempValue >>= 4;
  } while (bitOffset < 0x1C);

  uint32_t checksum = xorAccumulator & 0xF;
  if (!checksum)
    checksum = 1;

  return maskedValue + (checksum << 28);
}

int main()
{
  uint32_t values[] = {0x00B42531, 0x00B42532, 0x00B42533, 0x014CBBB9, 0x014CBBBA};
  for (size_t i = 0; i < sizeof(values) / sizeof(values[0]); ++i)
  {
    uint32_t val = values[i];
    uint32_t enc = encryptOriginalValue(val);
    printf("0x%.8X => 0x%.8X\n", val, enc);
  }
  return 0;
}