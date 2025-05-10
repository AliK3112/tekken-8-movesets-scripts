#include <cstdint>
#include <iostream>

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
uint32_t TK__transformAndPack24BitWith8BitChecksum(uint32_t *input);
uint32_t TK__validateAndTransform28BitKey(uint32_t *target_addr, uint32_t original_value);

// DECRYPTING
uint32_t TK__decrypt20BitWith12BitChecksum(uint32_t value);
uint32_t TK__decrypt24BitWith8BitChecksum(uint32_t value);
uint32_t TK__decrypt26BitWith6BitChecksum(uint32_t value);
uint32_t TK__decrypt28BitWith4BitChecksum(uint32_t value);
uint64_t TK__decrypt32BitWith32BitChecksum(uint64_t value);
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

  // Pack into [checksum:32][input:32]
  return (uint64_t)input | ((uint64_t)checksum << 32);
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

    // Rotate key left by (position + 8) bits
    while (rotate_count--)
    {
      rotated_key = (rotated_key >> 63) | (rotated_key << 1);
    }

    // Mix current byte into checksum
    uint8_t current_byte = remaining_bits & 0xFF;
    checksum ^= current_byte ^ (rotated_key & 0xFF);
    remaining_bits >>= 8;
  }

  // Ensure checksum is never 0
  if (checksum == 0)
  {
    checksum = 1;
  }

  // Pack into [checksum:32][value:32]
  return (uint64_t)value | ((uint64_t)checksum << 32);
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

uint32_t TK__transformAndPack24BitWith8BitChecksum(uint32_t *input)
{
  const uint64_t kMagic = 0xEDCCFB96DCA40FBA;

  // Stage 1: Initial transformation
  uint32_t initial_value = *input;
  uint64_t scrambled = kMagic;

  // Apply bit rotation based on lower 5 bits
  uint8_t rotate_count = initial_value & 0x1F;
  while (rotate_count--)
  {
    scrambled = (scrambled >> 63) | (scrambled << 1); // Standard rotate left
  }

  // First transformation mix
  uint32_t transformed = (initial_value ^ (scrambled & 0xFFFFFFE0)) ^ 0x1D;
  transformed &= 0xFFFFFF; // Keep only 24 bits

  // Stage 2: Checksum calculation
  uint8_t checksum = 0;
  uint32_t remaining_bits = transformed;

  // Process in 8-bit chunks (3 iterations for 24 bits)
  for (uint32_t byte_offset = 0; byte_offset < 24; byte_offset += 8)
  {
    uint64_t checksum_magic = kMagic;
    uint8_t checksum_rotate = byte_offset + 8;

    while (checksum_rotate--)
    {
      checksum_magic = (checksum_magic >> 63) | (checksum_magic << 1);
    }

    uint8_t current_byte = remaining_bits & 0xFF;
    checksum ^= current_byte ^ (checksum_magic & 0xFF);
    remaining_bits >>= 8;
  }

  // Ensure checksum is never 0
  if (checksum == 0)
  {
    checksum = 1;
  }

  // Final packing
  uint32_t result = transformed | (checksum << 24);
  *input = result;
  return result;
}

/**
 * Validates, transforms, and encrypts a 28-bit key value in-place
 * @param target_addr Pointer to store the transformed value
 * @param original_value Input value to process
 * @return The decryption key needed to reverse the transformation, generally the original value itself
 */
uint32_t TK__validateAndTransform28BitKey(uint32_t *target_addr, uint32_t original_value)
{
  const uint64_t kMagic = 0xEDCCFB96DCA40FBA;

  // Stage 1: Initial transformation
  uint64_t scrambled = kMagic;
  uint8_t transform_rotations = original_value & 0x1F;

  while (transform_rotations--)
  {
    scrambled = (scrambled >> 63) | (scrambled << 1); // Rotate left
  }

  // Apply first transformation mix
  uint32_t transformed = (original_value ^ (scrambled & 0xFFFFFFE0) ^ 0x1D) & 0x0FFFFFFF;

  // Stage 2: Checksum calculation
  uint8_t checksum = 0;
  uint32_t remaining_bits = transformed;

  // Process in 4-bit chunks (7 iterations for 28 bits)
  for (uint32_t nibble_offset = 0; nibble_offset < 28; nibble_offset += 4)
  {
    uint64_t checksum_magic = kMagic;
    uint8_t checksum_rotations = nibble_offset + 4;

    while (checksum_rotations--)
    {
      checksum_magic = (checksum_magic >> 63) | (checksum_magic << 1);
    }

    uint8_t current_nibble = remaining_bits & 0xF;
    checksum ^= current_nibble ^ (checksum_magic & 0xF);
    remaining_bits >>= 4;
  }

  // Finalize checksum (4-bit)
  checksum &= 0xF;
  if (checksum == 0)
    checksum = 1;

  // Create packed value
  uint32_t packed_value = transformed | (checksum << 28);
  *target_addr = packed_value;

  // Validation check
  if (TK__pack28BitWith4BitChecksum(packed_value) != packed_value)
  {
    return 0; // Validation failed
  }

  // Generate return key
  uint32_t decryption_key = packed_value ^ 0x1D;
  uint64_t return_key_magic = kMagic;
  uint8_t key_rotations = decryption_key & 0x1F;

  while (key_rotations--)
  {
    return_key_magic = (return_key_magic >> 63) | (return_key_magic << 1);
  }

  return (decryption_key ^ (return_key_magic & 0xFFFFFFE0)) & 0x0FFFFFFF;
}

/**
 * Validates and transforms a 32-bit value containing 20-bit data with 12-bit checksum
 * @param value Packed value ([12-bit-checksum][20-bit-data])
 * @return Transformed value or 0 if validation fails
 */
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

/**
 * Validates and decrypts a 24-bit value with 8-bit checksum
 * @param value Packed value to decrypt ([8-bit-checksum][24-bit-data])
 * @return Decrypted value or 0 if validation fails
 */
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

/**
 * Decrypts 26-bit value with 6-bit checksum
 * @param value Packed value ([6-bit-checksum][26-bit-data])
 * @return Decrypted value or 0 if invalid
 */
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

/**
 * Validates and decrypts a 28-bit value with 4-bit checksum
 * @param value Packed value to decrypt ([4-bit-checksum][28-bit-data])
 * @return Decrypted value or 0 if validation fails
 */
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

/**
 * Validates and transforms a 64-bit value containing 32-bit data with 32-bit checksum
 * @param value Packed value ([32-bit-checksum][32-bit-data])
 * @return Transformed value or 0 if validation fails
 */
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

/**
 * Validates and transforms a 64-bit value containing 56-bit data with 8-bit checksum
 * @param value Packed value ([8-bit-checksum][56-bit-data])
 * @return Transformed value or 0 if validation fails
 */
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

int main()
{
  // uint32_t value = 0x6FB10400;
  // uint32_t *ptr = new uint32_t;
  // *ptr = value;

  // printf("Original value: 0x%.8x\n", value);
  // uint32_t transformed = TK__decrypt24BitWith8BitChecksum(value);
  // printf("transformed: 0x%.8x\n", transformed);
  // printf("value: 0x%.8x\n", *ptr);
  // delete ptr;

  // uint32_t value = 0x09AB9928;
  // uint64_t checksum = TK__pack32BitWith32BitChecksum(value);
  // uint64_t decrypted = TK__decrypt32BitWith32BitChecksum(checksum);
  // printf("value: 0x%.8x\n", value);
  // printf("checksum: 0x%.16llx\n", checksum);
  // printf("decrypted: 0x%.16llx\n", decrypted);

  return 0;
}
