#include "game.h"
#include "tekken.h"

GameClass game;
uintptr_t ANMBIN_ADDR = 0xB41190000; // Put address here

struct AnmBinHeader
{
  uint32_t offset; // offset to actual data
  uint32_t count[12]; // counts for each type
  uint32_t _0x34; // empty 4-bytes
  uintptr_t offsets[12]; // offsets to each type data
};

struct AnmEntry
{
  uint64_t key; // 0x0
  uint64_t anim_addr; // 0x8
  uint32_t _0x10; // unknown
  uint32_t _0x14; // unknown
  uint32_t _0x18; // unknown (always 0x40)
  uint32_t _0x1c; // unknown
  uint32_t _0x20; // unknown
  uint32_t _0x24; // unknown
  uint32_t _0x28; // unknown
  uint32_t _0x2c; // unknown
  uint32_t _0x30; // unknown
  uint32_t _0x34; // unknown
};

int main()
{
  if (!game.Attach(L"Polaris-Win64-Shipping.exe"))
  {
    return 1;
  }

  AnmBinHeader anmHeader = game.read<AnmBinHeader>(ANMBIN_ADDR);
  uintptr_t animBlockAddr = ANMBIN_ADDR + anmHeader.offset;
  printf("ANMBIN Header Offset: 0x%X\n", anmHeader.offset);
  for (int i = 0; i < 12; i++)
  {
    // uintptr_t offset = anmHeader.offsets[i] - ANMBIN_ADDR;
    uintptr_t offset = anmHeader.offsets[i];
    printf("Type %2d: Count = %d, Offset = 0x%llx\n", i, anmHeader.count[i], offset);
    // uintptr_t start = anmHeader.offsets[i];
    // for (int j = 0; j < anmHeader.count[i]; j++)
    // {
    //   uintptr_t entryAddr = start + j * 0x38;
    //   AnmEntry entry = game.read<AnmEntry>(entryAddr);
    //   printf("  Entry %4d: Key = 0x%.8llx", j, entry.key);
    //   printf(", AnimOffset = 0x%llx", entry.anim_addr ? entry.anim_addr - animBlockAddr : 0);
    //   printf(", AnimAddr = 0x%llx", entry.anim_addr);
    //   printf("\n");
    // }
  }
  return 0;
}