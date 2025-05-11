#include <cstdint>

struct tk_encrypted
{
  uint64_t value;
  uint64_t key;
};

// PACKING CHECKSUM
uint32_t TK__pack20BitWith12BitChecksum(uint32_t input);
uint32_t TK__pack24BitWith8BitChecksum(uint32_t input);
uint32_t TK__pack26BitWith6BitChecksum(uint32_t input);
uint32_t TK__pack28BitWith4BitChecksum(uint32_t input);
uint32_t TK__pack28BitWith4BitChecksumUsingKey(uint32_t input, uint64_t key);
uint64_t TK__pack32BitWith32BitChecksum(uint32_t input);
uint64_t TK__pack32BitWith32BitChecksumUsingKey(uint32_t value, uint64_t key);
uint64_t TK__pack56BitWith8BitChecksum(uint64_t input);

// ENCRYPTING
uint32_t TK__encrypt20BitWith12BitChecksum(uint32_t original_value);
uint32_t TK__encrypt24BitWith8BitChecksum(uint32_t original_value);
uint32_t TK__encrypt26BitWith6BitChecksum(uint32_t original_value);
uint32_t TK__encrypt28BitWith4BitChecksum(uint32_t original_value);
uint32_t TK__encrypt28BitWith4BitChecksumUsingKey(uint32_t original_value, uint64_t key);
uint64_t TK__encrypt32BitWith32BitChecksum(uint32_t original_value);
uint64_t TK__encrypt32BitWith32BitChecksumUsingKey(uint32_t original_value, uint64_t key);
uint64_t TK__encrypt56BitWith8BitChecksum(uint64_t original_value);
uint64_t TK__encrypt56BitWith8BitChecksumUsingKey(uint64_t original_value, uint64_t key);

// DECRYPTING
uint32_t TK__decrypt20BitWith12BitChecksum(uint32_t value);
uint32_t TK__decrypt24BitWith8BitChecksum(uint32_t value);
uint32_t TK__decrypt26BitWith6BitChecksum(uint32_t value);
uint32_t TK__decrypt28BitWith4BitChecksum(uint32_t value);
uint32_t TK__decrypt28BitWith4BitChecksumUsingKey(uint32_t value, uint64_t key);
uint64_t TK__decrypt32BitWith32BitChecksum(uint64_t value);
uint64_t TK__decrypt32BitWith32BitChecksumUsingKey(uint64_t value, uint64_t key);
uint64_t TK__decrypt56BitWith8BitChecksum(uint64_t value);

// DEFINITIONS

uint32_t TK__pack20BitWith12BitChecksum(uint32_t input)
{
  const uint64_t kMagic = 0xEDCCFB96DCA40FBA;
  uint16_t checksum = 0;                     // Needs to hold 12-bit value
  uint32_t remaining_bits = input & 0xFFFFF; // Keep only 20 bits

  // Process in 8-bit chunks (2 full bytes + 4 bits)
  for (uint32_t byte_offset = 0; byte_offset < 20; byte_offset += 8)
  {
    // Rotate magic constant based on position
    uint64_t rotated_magic = kMagic;
    uint8_t rotate_count = byte_offset + 8;

    while (rotate_count--)
    {
      rotated_magic = (rotated_magic >> 63) | (rotated_magic << 1); // Rotate left
    }

    // Mix current byte (or partial byte) into checksum
    uint8_t current_byte = remaining_bits & 0xFF;
    checksum ^= current_byte ^ (rotated_magic & 0xFF);

    remaining_bits >>= 8;
  }

  // Ensure checksum is never 0 and fits in 12 bits
  checksum &= 0xFFF;
  if (checksum == 0)
  {
    checksum = 1;
  }

  // Pack into [checksum:12][input:20]
  return (input & 0xFFFFF) | (checksum << 20);
}

uint32_t TK__pack24BitWith8BitChecksum(uint32_t input)
{
  const uint64_t kMagic = 0xEDCCFB96DCA40FBA;
  uint8_t checksum = 0;

  uint32_t remaining_bits = input & 0xFFFFFF; // Keep only 24 bits

  for (uint32_t bit_offset = 0; bit_offset < 24; bit_offset += 8)
  {
    // Rotate magic constant based on position
    uint64_t rotated_magic = kMagic;
    uint8_t rotate_count = bit_offset + 8; // 8, 16, 24

    while (rotate_count--)
    {
      rotated_magic = (rotated_magic >> 63) | (rotated_magic << 1); // Rotate left
    }

    // Mix current byte into checksum
    uint8_t current_byte = remaining_bits & 0xFF;
    checksum ^= current_byte ^ static_cast<uint8_t>(rotated_magic);

    remaining_bits >>= 8; // Process next byte
  }

  // Ensure checksum is never 0
  if (checksum == 0)
    checksum = 1;

  // Pack into [checksum:8][input:24]
  return (input & 0xFFFFFF) | (checksum << 24);
}

uint32_t TK__pack26BitWith6BitChecksum(uint32_t input)
{
  const uint64_t kMagic = 0xEDCCFB96DCA40FBA;
  uint8_t checksum = 0;
  uint32_t remaining_bits = input & 0x3FFFFFF; // Keep only 26 bits

  // Process in 6-bit chunks (4 full chunks + partial)
  for (uint32_t bit_offset = 0; bit_offset < 26; bit_offset += 6)
  {
    // Rotate magic constant based on position
    uint64_t rotated_magic = kMagic;
    uint8_t rotate_count = bit_offset + 6;

    while (rotate_count--)
    {
      rotated_magic = (rotated_magic >> 63) | (rotated_magic << 1); // Rotate left
    }

    // Mix current 6 bits into checksum
    uint8_t current_chunk = remaining_bits & 0x3F;
    checksum ^= current_chunk ^ (rotated_magic & 0x3F);

    remaining_bits >>= 6;
  }

  // Ensure checksum is never 0 and fits in 6 bits
  checksum &= 0x3F;
  if (checksum == 0)
  {
    checksum = 1;
  }

  // Pack into [checksum:6][input:26]
  return (input & 0x3FFFFFF) | (checksum << 26);
}

uint32_t TK__pack28BitWith4BitChecksum(uint32_t input)
{
  const uint64_t kMagic = 0xEDCCFB96DCA40FBA;
  uint8_t checksum = 0;
  uint32_t remaining_bits = input & 0x0FFFFFFF; // Keep only 28 bits

  // Process 7 nibbles (4 bits each)
  for (uint32_t bit_offset = 0; bit_offset < 28; bit_offset += 4)
  {
    // Rotate magic constant based on position
    uint64_t rotated_magic = kMagic;
    uint8_t rotate_count = bit_offset + 4; // 4, 8, 12,...,28

    while (rotate_count--)
    {
      rotated_magic = (rotated_magic >> 63) | (rotated_magic << 1); // Rotate left
    }

    // Mix current nibble into checksum
    uint8_t current_nibble = remaining_bits & 0xF;
    checksum ^= current_nibble ^ (rotated_magic & 0xF);

    remaining_bits >>= 4;
  }

  // Ensure checksum is never 0
  if (checksum == 0)
    checksum = 1;

  // Pack into [checksum:4][input:28]
  return (input & 0x0FFFFFFF) | ((checksum & 0xF) << 28);
}

uint32_t TK__pack28BitWith4BitChecksumUsingKey(uint32_t input, uint64_t key)
{
  uint8_t checksum = 0;
  uint32_t remaining_bits = input & 0x0FFFFFFF; // Keep only 28 bits

  // Process 7 nibbles (4 bits each)
  for (uint32_t nibble_offset = 0; nibble_offset < 28; nibble_offset += 4)
  {
    uint64_t rotated_key = key;
    uint8_t rotate_count = nibble_offset + 4; // Rotations: 4,8,12,...,28

    // Rotate key left by (position + 4) bits
    while (rotate_count--)
    {
      rotated_key = (rotated_key >> 63) | (rotated_key << 1);
    }

    // Mix current nibble into checksum
    uint8_t current_nibble = remaining_bits & 0xF;
    checksum ^= current_nibble ^ (rotated_key & 0xF);
    remaining_bits >>= 4;
  }

  // Ensure checksum is never 0 and keep only 4 bits
  checksum &= 0xF;
  if (checksum == 0)
  {
    checksum = 1;
  }

  // Pack into [checksum:4][input:28]
  return (input & 0x0FFFFFFF) | (checksum << 28);
}

uint64_t TK__pack32BitWith32BitChecksum(uint32_t input)
{
  const uint64_t kMagic = 0xEDCCFB96DCA40FBA;
  uint32_t checksum = 0;
  uint32_t remaining_bits = input;

  // Process in 8-bit chunks (4 iterations for 32 bits)
  for (uint32_t byte_offset = 0; byte_offset < 32; byte_offset += 8)
  {
    // Rotate magic constant based on position
    uint64_t rotated_magic = kMagic;
    uint8_t rotate_count = byte_offset + 8;

    while (rotate_count--)
    {
      rotated_magic = (rotated_magic >> 63) | (rotated_magic << 1); // Standard rotate left
    }

    // XOR 32-bit remainder with 32-bit rotated magic (as per real implementation)
    checksum ^= remaining_bits ^ static_cast<uint32_t>(rotated_magic);

    remaining_bits >>= 8;
  }

  // Ensure checksum is never 0
  if (checksum == 0)
  {
    checksum = 1;
  }

  // Pack into [checksum:32][input:32]
  return static_cast<uint64_t>(input) | (static_cast<uint64_t>(checksum) << 32);
}

uint64_t TK__pack32BitWith32BitChecksumUsingKey(uint32_t value, uint64_t key)
{
  uint32_t checksum = 0;
  uint32_t remaining_bits = value;

  // Process in 8-bit chunks (4 iterations for 32 bits)
  for (uint32_t byte_offset = 0; byte_offset < 32; byte_offset += 8)
  {
    uint64_t rotated_key = key;
    uint8_t rotate_count = byte_offset + 8;

    // Rotate key left by (byte_offset + 8) bits
    while (rotate_count--)
    {
      rotated_key = (rotated_key >> 63) | (rotated_key << 1);
    }

    // XOR full 32-bit remainder with full 32-bit rotated key (as in disassembly)
    checksum ^= remaining_bits ^ static_cast<uint32_t>(rotated_key);
    remaining_bits >>= 8;
  }

  // Ensure checksum is never 0
  if (checksum == 0)
  {
    checksum = 1;
  }

  // Pack into [checksum:32][value:32]
  return static_cast<uint64_t>(value) | (static_cast<uint64_t>(checksum) << 32);
}

uint64_t TK__pack56BitWith8BitChecksum(uint64_t input)
{
  const uint64_t kMagic = 0xEDCCFB96DCA40FBA;
  uint8_t checksum = 0;
  uint64_t remaining_bits = input & 0x00FFFFFFFFFFFFFF; // Keep only 56 bits

  // Process in 8-bit chunks (7 iterations for 56 bits)
  for (uint32_t byte_offset = 0; byte_offset < 56; byte_offset += 8)
  {
    // Rotate magic constant based on position
    uint64_t rotated_magic = kMagic;
    uint8_t rotate_count = byte_offset + 8;

    while (rotate_count--)
    {
      rotated_magic = (rotated_magic >> 63) | (rotated_magic << 1); // Standard rotate left
    }

    // Mix current byte into checksum
    uint8_t current_byte = remaining_bits & 0xFF;
    checksum ^= current_byte ^ (rotated_magic & 0xFF);

    remaining_bits >>= 8;
  }

  // Ensure checksum is never 0
  if (checksum == 0)
  {
    checksum = 1;
  }

  // Pack into [checksum:8][input:56]
  return (input & 0x00FFFFFFFFFFFFFF) | (static_cast<uint64_t>(checksum) << 56);
}

uint32_t TK__encrypt20BitWith12BitChecksum(uint32_t original_value)
{
  const uint64_t fixedKey = 0xEDCCFB96DCA40FBA;
  uint64_t rotatedKey = fixedKey;

  // Rotate key left by (original_value & 0x1F) bits
  int rotateAmount = original_value & 0x1F;
  for (int i = 0; i < rotateAmount; ++i)
  {
    rotatedKey = (rotatedKey >> 63) | (rotatedKey << 1);
  }

  // Apply base transformation (keep only 20 bits)
  uint32_t baseEncrypted = (original_value ^ (rotatedKey & 0xFFFFFFE0) ^ 0x1D) & 0x000FFFFF;

  uint32_t temp = baseEncrypted;
  uint16_t checksum = 0;

  // Compute checksum in 3 rounds (20 bits, in 8-bit steps)
  for (int offset = 0; offset < 20; offset += 8)
  {
    uint64_t rotatedSegment = fixedKey;
    int rotateCount = offset + 8;
    for (int j = 0; j < rotateCount; ++j)
    {
      rotatedSegment = (rotatedSegment >> 63) | (rotatedSegment << 1);
    }

    checksum ^= (uint16_t)(temp ^ rotatedSegment);
    temp >>= 8;
  }

  checksum &= 0x0FFF; // Keep lower 12 bits
  if (checksum == 0)
  {
    checksum = 1;
  }

  // Final 32-bit result: upper 12 bits = checksum, lower 20 bits = encrypted data
  return (checksum << 20) | baseEncrypted;
}

uint32_t TK__encrypt24BitWith8BitChecksum(uint32_t original_value)
{
  const uint64_t fixedKey = 0xEDCCFB96DCA40FBA;
  uint64_t rotatedKey = fixedKey;

  // Rotate the key left by (original_value & 0x1F) bits
  int rotateAmount = original_value & 0x1F;
  for (int i = 0; i < rotateAmount; ++i)
  {
    rotatedKey = (rotatedKey >> 63) | (rotatedKey << 1);
  }

  // Encrypt the lower 24 bits
  uint32_t baseEncrypted = (original_value ^ (rotatedKey & 0xFFFFFFE0)) ^ 0x1D;
  baseEncrypted &= 0x00FFFFFF;

  uint32_t temp = baseEncrypted;
  uint8_t checksum = 0;

  // Calculate checksum in 3 rounds of 8 bits
  for (int offset = 0; offset < 24; offset += 8)
  {
    uint64_t segmentRotated = fixedKey;
    int rotateCount = offset + 8;
    for (int j = 0; j < rotateCount; ++j)
    {
      segmentRotated = (segmentRotated >> 63) | (segmentRotated << 1);
    }

    checksum ^= (uint8_t)(temp ^ segmentRotated);
    temp >>= 8;
  }

  // Ensure non-zero checksum
  if (checksum == 0)
  {
    checksum = 1;
  }

  // Final result: upper 8 bits = checksum, lower 24 bits = encrypted value
  return ((uint32_t)checksum << 24) | baseEncrypted;
}

uint32_t TK__encrypt26BitWith6BitChecksum(uint32_t original_value)
{
  const uint64_t fixedKey = 0xEDCCFB96DCA40FBA;
  uint64_t rotatedKey = fixedKey;

  // Rotate key left by (original_value & 0x1F) bits
  int rotateAmount = original_value & 0x1F;
  for (int i = 0; i < rotateAmount; ++i)
  {
    rotatedKey = (rotatedKey >> 63) | (rotatedKey << 1);
  }

  // Encrypt lower 26 bits
  uint32_t baseEncrypted = (original_value ^ (rotatedKey & 0xFFFFFFE0) ^ 0x1D) & 0x03FFFFFF;
  uint32_t temp = baseEncrypted;
  uint8_t checksum = 0;

  // Compute 6-bit checksum in 5 rounds (6 bits at a time)
  for (int offset = 0; offset < 26; offset += 6)
  {
    uint64_t rotatedSegment = fixedKey;
    int rotateCount = offset + 6;
    for (int j = 0; j < rotateCount; ++j)
    {
      rotatedSegment = (rotatedSegment >> 63) | (rotatedSegment << 1);
    }

    checksum ^= (uint8_t)(temp ^ rotatedSegment);
    temp >>= 6;
  }

  checksum &= 0x3F; // 6 bits
  if (checksum == 0)
  {
    checksum = 1;
  }

  return (checksum << 26) | baseEncrypted;
}

uint32_t TK__encrypt28BitWith4BitChecksum(uint32_t original_value)
{
  const uint64_t fixedKey = 0xEDCCFB96DCA40FBA;
  uint64_t rotatedKey = fixedKey;

  // Use only the lower 28 bits of the input
  original_value &= 0x0FFFFFFF;

  // Rotate key left by (original_value & 0x1F) bits
  int rotateAmount = original_value & 0x1F;
  for (int i = 0; i < rotateAmount; ++i)
  {
    rotatedKey = (rotatedKey >> 63) | (rotatedKey << 1);
  }

  // Base encrypted value (28-bit)
  uint32_t baseEncrypted = (original_value ^ (rotatedKey & 0xFFFFFFE0) ^ 0x1D) & 0x0FFFFFFF;
  uint32_t temp = baseEncrypted;
  uint8_t checksum = 0;

  // Generate 4-bit checksum over 7 segments (4 bits each)
  for (int offset = 0; offset < 28; offset += 4)
  {
    uint64_t segmentRotated = fixedKey;
    int rotateCount = offset + 4;
    for (int j = 0; j < rotateCount; ++j)
    {
      segmentRotated = (segmentRotated >> 63) | (segmentRotated << 1);
    }
    checksum ^= (uint8_t)(temp ^ segmentRotated);
    temp >>= 4;
  }

  // Keep only the lower 4 bits, and ensure non-zero
  checksum &= 0xF;
  if (checksum == 0)
  {
    checksum = 1;
  }

  // Final 32-bit value: upper 4 bits = checksum, lower 28 bits = encrypted value
  return ((uint32_t)checksum << 28) | baseEncrypted;
}

uint32_t TK__encrypt28BitWith4BitChecksumUsingKey(uint32_t original_value, uint64_t key)
{
  uint64_t rotatedKey = key;

  original_value &= 0x0FFFFFFF;

  int rotateAmount = original_value & 0x1F;
  for (int i = 0; i < rotateAmount; ++i)
  {
    rotatedKey = (rotatedKey >> 63) | (rotatedKey << 1);
  }

  uint32_t baseEncrypted = (original_value ^ (rotatedKey & 0xFFFFFFE0) ^ 0x1D) & 0x0FFFFFFF;
  uint32_t temp = baseEncrypted;
  uint8_t checksum = 0;

  for (int offset = 0; offset < 28; offset += 4)
  {
    uint64_t segmentKey = key; // <- not rotatedKey! Always restart from base key
    int rotateCount = offset + 4;
    for (int j = 0; j < rotateCount; ++j)
    {
      segmentKey = (segmentKey >> 63) | (segmentKey << 1);
    }

    checksum ^= (uint8_t)(temp ^ segmentKey);
    temp >>= 4;
  }

  checksum &= 0xF;
  if (checksum == 0)
  {
    checksum = 1;
  }

  return ((uint32_t)checksum << 28) | baseEncrypted;
}

uint64_t TK__encrypt32BitWith32BitChecksum(uint32_t original_value)
{
  const uint64_t fixedKey = 0xEDCCFB96DCA40FBA;
  uint64_t rotatedKey = fixedKey;

  // Rotate key left by (original_value & 0x1F) bits
  int rotateAmount = original_value & 0x1F;
  for (int i = 0; i < rotateAmount; ++i)
  {
    rotatedKey = (rotatedKey >> 63) | (rotatedKey << 1);
  }

  // Compute base encrypted value
  uint64_t baseEncrypted = original_value ^ (rotatedKey & 0xFFFFFFE0) ^ 0x1D;
  uint64_t checksumSource = baseEncrypted;
  uint32_t checksum = 0;

  // Generate checksum using 4 rounds
  for (int offset = 0; offset < 32; offset += 8)
  {
    uint64_t rotatedFixedKey = fixedKey;
    int rotateCount = offset + 8;
    for (int j = 0; j < rotateCount; ++j)
    {
      rotatedFixedKey = (rotatedFixedKey >> 63) | (rotatedFixedKey << 1);
    }
    checksum ^= (uint32_t)(checksumSource ^ rotatedFixedKey);
    checksumSource >>= 8;
  }

  if (checksum == 0)
  {
    checksum = 1;
  }

  // Final encrypted 64-bit result
  return baseEncrypted + ((uint64_t)checksum << 32);
}

uint64_t TK__encrypt32BitWith32BitChecksumUsingKey(uint32_t original_value, uint64_t key)
{
  uint64_t rotated = key;

  // Rotate key left by (original_value & 0x1F) bits
  int rotateBits = original_value & 0x1F;
  for (int i = 0; i < rotateBits; ++i)
  {
    rotated = (rotated >> 63) | (rotated << 1);
  }

  // Base encrypted value
  uint64_t baseEncrypted = original_value ^ (rotated & 0xFFFFFFE0) ^ 0x1D;
  uint64_t checksumSource = baseEncrypted;
  uint32_t checksum = 0;

  // Generate checksum using key rotations
  for (int offset = 0; offset < 32; offset += 8)
  {
    uint64_t temp = key;
    int rotateCount = offset + 8;
    for (int j = 0; j < rotateCount; ++j)
    {
      temp = (temp >> 63) | (temp << 1);
    }
    checksum ^= (uint32_t)(checksumSource ^ temp);
    checksumSource >>= 8;
  }

  if (checksum == 0)
  {
    checksum = 1;
  }

  return baseEncrypted + ((uint64_t)checksum << 32);
}

uint64_t TK__encrypt56BitWith8BitChecksum(uint64_t original_value)
{
  const uint64_t fixedKey = 0xEDCCFB96DCA40FBA;
  uint64_t rotatedKey = fixedKey;

  // Rotate key left by (original_value & 0x1F) bits
  int rotateAmount = original_value & 0x1F;
  for (int i = 0; i < rotateAmount; ++i)
  {
    rotatedKey = (rotatedKey >> 63) | (rotatedKey << 1);
  }

  // Encrypt the lower 56 bits
  uint64_t baseEncrypted = (original_value ^ (rotatedKey & 0xFFFFFFFFFFFFFFE0ull) ^ 0x1D) & 0x00FFFFFFFFFFFFFFull;
  uint64_t temp = baseEncrypted;
  uint8_t checksum = 0;

  // Compute checksum in 7 rounds (8 bits each)
  for (int offset = 0; offset < 56; offset += 8)
  {
    uint64_t rotatedSegment = fixedKey;
    int rotateCount = offset + 8;
    for (int j = 0; j < rotateCount; ++j)
    {
      rotatedSegment = (rotatedSegment >> 63) | (rotatedSegment << 1);
    }

    checksum ^= (uint8_t)(temp ^ rotatedSegment);
    temp >>= 8;
  }

  if (checksum == 0)
  {
    checksum = 1;
  }

  // Final result: upper 8 bits = checksum, lower 56 bits = encrypted value
  return ((uint64_t)checksum << 56) | baseEncrypted;
}

// Generated by ChatGPT by inference
uint64_t TK__encrypt56BitWith8BitChecksumUsingKey(uint64_t original_value, uint64_t key)
{
  // Rotate key left by (original_value & 0x1F) bits
  int rotateAmount = original_value & 0x1F;
  for (int i = 0; i < rotateAmount; ++i)
  {
    key = (key >> 63) | (key << 1);
  }

  // Encrypt the lower 56 bits
  uint64_t baseEncrypted = (original_value ^ (key & 0xFFFFFFFFFFFFFFE0ull) ^ 0x1D) & 0x00FFFFFFFFFFFFFFull;
  uint64_t temp = baseEncrypted;
  uint8_t checksum = 0;

  // Compute checksum in 7 rounds (8 bits each)
  for (int offset = 0; offset < 56; offset += 8)
  {
    uint64_t rotatedSegmentKey = key;
    for (int j = 0; j < offset + 8; ++j)
    {
      rotatedSegmentKey = (rotatedSegmentKey >> 63) | (rotatedSegmentKey << 1);
    }

    checksum ^= (uint8_t)(temp ^ rotatedSegmentKey);
    temp >>= 8;
  }

  if (checksum == 0)
  {
    checksum = 1;
  }

  return ((uint64_t)checksum << 56) | baseEncrypted;
}

uint32_t TK__decrypt20BitWith12BitChecksum(uint32_t value)
{
  const uint64_t kMagic = 0xEDCCFB96DCA40FBA;

  // 1. Validate checksum first
  if (TK__pack20BitWith12BitChecksum(value) != value)
  {
    return 0; // Invalid checksum
  }

  // 2. Begin transformation process
  uint32_t transformed = value ^ 0x1D;
  uint64_t scrambled = kMagic;

  // 3. Apply bit rotation based on lower 5 bits
  uint8_t rotations = transformed & 0x1F;
  while (rotations--)
  {
    scrambled = (scrambled >> 63) | (scrambled << 1); // Standard rotate left
  }

  // 4. Core transformation
  uint32_t intermediate = (transformed ^ (scrambled & 0xFFFFFFE0)) << 12;

  // 5. Replicate original floating-point division by 4096 (2^12)
  // Note: The original uses integer division after float conversion
  const double divisor = 4096.0; // 2^12
  return static_cast<uint32_t>(intermediate / divisor);
}

uint32_t TK__decrypt24BitWith8BitChecksum(uint32_t value)
{
  const uint64_t kMagic = 0xEDCCFB96DCA40FBA;

  // Validate checksum first (must match packed version)
  if (TK__pack24BitWith8BitChecksum(value) != value)
  {
    return 0; // Invalid checksum
  }

  // Begin decryption process
  uint32_t transformed = value ^ 0x1D;
  uint64_t scrambled = kMagic;

  // Apply bit rotation based on lower 5 bits
  uint8_t rotations = transformed & 0x1F;
  while (rotations--)
  {
    scrambled = (scrambled >> 63) | (scrambled << 1); // Standard rotate left
  }

  // Perform the exact transformation sequence
  uint32_t intermediate = (transformed ^ (scrambled & 0xFFFFFFE0));

  // Replicate the original floating-point division behavior
  return static_cast<uint32_t>((intermediate << 8) / 256.0);
}

uint32_t TK__decrypt26BitWith6BitChecksum(uint32_t value)
{
  const uint64_t kMagic = 0xEDCCFB96DCA40FBA;

  // Validate checksum
  if (TK__pack26BitWith6BitChecksum(value) != value)
    return 0;

  // Transform
  uint32_t transformed = value ^ 0x1D;
  uint64_t scrambled = kMagic;

  // Rotate magic constant
  uint8_t rotations = transformed & 0x1F;
  while (rotations--)
  {
    scrambled = (scrambled >> 63) | (scrambled << 1);
  }

  // Final calculation
  uint32_t intermediate = (transformed ^ (scrambled & 0xFFFFFFE0)) << 6;
  return static_cast<uint32_t>(intermediate / 64.0); // 2^6
}

uint32_t TK__decrypt28BitWith4BitChecksum(uint32_t value)
{
  const uint64_t kMagic = 0xEDCCFB96DCA40FBA;

  // Validate checksum first
  if (TK__pack28BitWith4BitChecksum(value) != value)
  {
    return 0; // Invalid checksum
  }

  // Begin decryption process
  uint32_t transformed = value ^ 0x1D;
  uint64_t scrambled = kMagic;

  // Apply bit rotation based on lower 5 bits
  uint8_t rotations = transformed & 0x1F;
  while (rotations--)
  {
    scrambled = (scrambled >> 63) | (scrambled << 1); // Standard rotate left
  }

  // Final transformation and scaling
  uint32_t intermediate = (transformed ^ (scrambled & 0xFFFFFFE0));

  // Replicate the original floating-point division behavior
  return static_cast<uint32_t>((intermediate << 4) / 16.0);
}

uint32_t TK__decrypt28BitWith4BitChecksumUsingKey(uint32_t value, uint64_t key)
{
  // 1. Validate checksum
  if (TK__pack28BitWith4BitChecksumUsingKey(value, key) != value)
  {
    return 0;
  }

  // 2. Initial transformation
  uint32_t transformed = value ^ 0x1D;

  // 3. Rotate key based on lower 5 bits
  uint8_t rotations = transformed & 0x1F;
  while (rotations--)
  {
    key = (key >> 63) | (key << 1); // Standard rotate left
  }

  // 4. Core transformation and scaling
  uint32_t intermediate = (transformed ^ (key & 0xFFFFFFE0)) * 16;
  return intermediate / 16; // Division by 16 (2^4) cancels the multiplication
}

uint64_t TK__decrypt32BitWith32BitChecksum(uint64_t value)
{
  const uint64_t kMagic = 0xEDCCFB96DCA40FBA;

  // 1. Validate checksum
  if (TK__pack32BitWith32BitChecksum(value) != value)
  {
    return 0; // Validation failed
  }

  // 2. Initial transformation
  uint64_t transformed = value ^ 0x1D;
  uint64_t scrambled = kMagic;

  // 3. Apply bit rotation based on lower 5 bits
  uint8_t rotations = transformed & 0x1F;
  while (rotations--)
  {
    scrambled = (scrambled >> 63) | (scrambled << 1); // Standard rotate left
  }

  // 4. Core transformation
  uint64_t intermediate = (transformed ^ (scrambled & 0xFFFFFFFFFFFFFFE0)) << 32;

  // 5. Handle the 2^32 division with original floating-point behavior
  // Note: The original uses floating-point division by 2^32
  // We'll replicate the exact behavior including overflow handling
  const double two_pow_32 = 4294967296.0; // 2^32
  double divisor = two_pow_32;
  uint64_t high_bit = 0;

  // Replicate the original overflow checks
  if (divisor >= 9.223372e18)
  { // 2^63
    divisor -= 9.223372e18;
    if (divisor < 9.223372e18)
    {
      high_bit = 0x8000000000000000;
    }
  }

  // Final division with original behavior
  double result = static_cast<double>(intermediate) / (high_bit + static_cast<uint64_t>(divisor));
  return static_cast<uint64_t>(result);
}

uint64_t TK__decrypt32BitWith32BitChecksumUsingKey(uint64_t value, uint64_t key)
{
  // 1. Validate checksum
  if (TK__pack32BitWith32BitChecksumUsingKey(value, key) != value)
  {
    return 0;
  }

  // 2. Initial transformation
  uint64_t transformed = value ^ 0x1D;

  // 3. Rotate key based on lower 5 bits
  uint8_t rotations = transformed & 0x1F;
  while (rotations--)
  {
    key = (key >> 63) | (key << 1); // Rotate left
  }

  // 4. Core transformation
  uint64_t intermediate = (transformed ^ (key & 0xFFFFFFFFFFFFFFE0)) << 32;

  // 5. Division by 2^32 with original FP behavior
  const double divisor = 4294967296.0; // 2^32
  uint64_t high_bit = (divisor >= 9.223372e18) ? 0x8000000000000000 : 0;

  return static_cast<uint64_t>(intermediate / (divisor + high_bit));
}

uint64_t TK__decrypt56BitWith8BitChecksum(uint64_t value)
{
  const uint64_t kMagic = 0xEDCCFB96DCA40FBA;

  // 1. Validate checksum first
  if (TK__pack56BitWith8BitChecksum(value) != value)
  {
    return 0; // Invalid checksum
  }

  // 2. Begin decryption process
  uint64_t transformed = value ^ 0x1D;
  uint64_t scrambled = kMagic;

  // 3. Apply bit rotation based on lower 5 bits
  uint8_t rotations = transformed & 0x1F;
  while (rotations--)
  {
    scrambled = (scrambled >> 63) | (scrambled << 1); // Standard rotate left
  }

  // 4. Core transformation
  uint64_t intermediate = (transformed ^ (scrambled & 0xFFFFFFFFFFFFFFE0)) << 8;

  // 5. Replicate original floating-point division by 256 (2^8)
  // Note: The original uses special handling for large values
  const double divisor = 256.0; // 2^8
  uint64_t high_bit = 0;
  double adjusted_divisor = divisor;

  // Replicate the original overflow checks
  if (divisor >= 9.223372e18)
  { // 2^63
    adjusted_divisor = divisor - 9.223372e18;
    if (adjusted_divisor < 9.223372e18)
    {
      high_bit = 0x8000000000000000;
    }
  }

  // Final division with original behavior
  return static_cast<uint64_t>(intermediate / (high_bit + adjusted_divisor));
}
