#include <cstdint>

// DEFAULT KEY FOR ALL IS 0xEDCCFB96DCA40FBA

// PACKING CHECKSUM
uint32_t TK__pack20BitWith12BitChecksum(uint32_t input, uint64_t key = 0xEDCCFB96DCA40FBA);
uint32_t TK__pack24BitWith8BitChecksum(uint32_t input, uint64_t key = 0xEDCCFB96DCA40FBA);
uint32_t TK__pack26BitWith6BitChecksum(uint32_t input, uint64_t key = 0xEDCCFB96DCA40FBA);
uint32_t TK__pack28BitWith4BitChecksum(uint32_t input, uint64_t key = 0xEDCCFB96DCA40FBA);
uint64_t TK__pack32BitWith32BitChecksum(uint32_t input, uint64_t key = 0xEDCCFB96DCA40FBA);
uint64_t TK__pack56BitWith8BitChecksum(uint64_t input, uint64_t key = 0xEDCCFB96DCA40FBA);

// ENCRYPTING
uint32_t TK__encrypt20BitWith12BitChecksum(uint32_t original_value, uint64_t key = 0xEDCCFB96DCA40FBA);
uint32_t TK__encrypt24BitWith8BitChecksum(uint32_t original_value, uint64_t key = 0xEDCCFB96DCA40FBA);
uint32_t TK__encrypt26BitWith6BitChecksum(uint32_t original_value, uint64_t key = 0xEDCCFB96DCA40FBA);
uint32_t TK__encrypt28BitWith4BitChecksum(uint32_t original_value, uint64_t key = 0xEDCCFB96DCA40FBA);
uint64_t TK__encrypt32BitWith32BitChecksum(uint32_t original_value, uint64_t key = 0xEDCCFB96DCA40FBA);
uint64_t TK__encrypt56BitWith8BitChecksum(uint64_t original_value, uint64_t key = 0xEDCCFB96DCA40FBA);

// DECRYPTING
uint32_t TK__decrypt20BitWith12BitChecksum(uint32_t value, uint64_t key = 0xEDCCFB96DCA40FBA);
uint32_t TK__decrypt24BitWith8BitChecksum(uint32_t value, uint64_t key = 0xEDCCFB96DCA40FBA);
uint32_t TK__decrypt26BitWith6BitChecksum(uint32_t value, uint64_t key = 0xEDCCFB96DCA40FBA);
uint32_t TK__decrypt28BitWith4BitChecksum(uint32_t value, uint64_t key = 0xEDCCFB96DCA40FBA);
uint64_t TK__decrypt32BitWith32BitChecksum(uint64_t value, uint64_t key = 0xEDCCFB96DCA40FBA);
uint64_t TK__decrypt56BitWith8BitChecksum(uint64_t value, uint64_t key = 0xEDCCFB96DCA40FBA);

// DEFINITIONS ARE IN "tk_encryption.cpp" FILE