#include "game.h"
#include "tekken.h"

// This file mainly is for trying to get some meaningful values from the raw moveset file
// i.e, length of the move name etc...

enum RawFile
{
  Address = 0x0,
  Size = 0x8,
};

GameClass game;

uintptr_t PLAYER_STRUCT_BASE = 0;
uintptr_t MOVESET_OFFSET = 0;
uintptr_t RAW_MOVESET_BASE = 0;

uintptr_t getRawMovesetAddress(int side, DWORD offset);
uintptr_t getMovesetAddress(uintptr_t playerAddr);
uintptr_t getPlayerAddress(int side);
void scanAddresses();

int main()
{
  if (game.Attach(L"Polaris-Win64-Shipping.exe"))
  {
    scanAddresses();

    int player = 0;
    uintptr_t rawMoveset = getRawMovesetAddress(player, RawFile::Address);
    // uintptr_t fileSize = getRawMovesetAddress(player, RawFile::Size);
    // printf("0x%llx %d bytes\n", rawMoveset, fileSize);
    // return 0;

    uintptr_t moveset = getMovesetAddress(getPlayerAddress(player));
    uintptr_t movelist = game.readUInt64(moveset + Tekken::Offsets::MovesHeader);
    int count = game.readUInt64(moveset + Tekken::Offsets::MovesCount);
    uintptr_t addr = movelist;
    EncryptedValue encrypted;

    auto calcOffset = [&](uintptr_t relativeAddr) -> uintptr_t
    {
      return (relativeAddr - moveset) + rawMoveset;
    };

    // printf("INDEX NAME_KEY ANIM_KEY ANIM_IDX NAME_LENGTH ANIM_LENGTH\n");
    printf("%5s %-10s %-10s %-10s %-11s %-11s %-10s %-10s\n", "INDEX", "NAME_KEY", "ANIM_KEY", "ANIM_IDX", "NAME_LENGTH", "ANIM_LENGTH", "ORDINAL_1", "ORDINAL_2");
    for (int i = 0; i < count; i++)
    {
      addr = movelist + i * Tekken::Sizes::Moveset::Move;

      encrypted = game.read<EncryptedValue>(addr);
      int nameKey = Tekken::validateAndTransform64BitValue(&encrypted);

      encrypted = game.read<EncryptedValue>(addr + 0x20);
      int animKey = Tekken::validateAndTransform64BitValue(&encrypted);

      int animIdx = game.readInt32(addr + 0x50);

      int animRawIdx = game.readInt32(calcOffset(addr + 0x50));

      uintptr_t off = calcOffset(addr + 0x48);
      int nameLen = game.readUInt64(off) - game.readUInt64(calcOffset(addr + 0x40));

      int animNameLen = game.readUInt64(count - 1 > i ? off + 0x448 : off) - game.readUInt64(off);

      encrypted = game.read<EncryptedValue>(addr + 0xD0);
      int ordinalId1 = Tekken::validateAndTransform64BitValue(&encrypted);

      encrypted = game.read<EncryptedValue>(addr + 0xF0);
      int ordinalId2 = Tekken::validateAndTransform64BitValue(&encrypted);

      printf("%-5d ", i);
      printf("0x%.8x ", nameKey);
      printf("0x%.8x ", animKey);
      printf("0x%.8x ", animIdx);
      // printf("%s ", animRawIdx == i ? "Yes" : "No");
      printf("%-11d ", nameLen - 1);
      printf("%-11d ", animNameLen - 1);
      printf("0x%.8x ", ordinalId1);
      printf("0x%.8x ", ordinalId2);
      printf("\n");
      // if (i >= 11) break;
    }
  }
  return 0;
}

uintptr_t getRawMovesetAddress(int side, DWORD offset)
{
  return game.getAddress({(DWORD)RAW_MOVESET_BASE, 0x68, (DWORD)(0x2D0 + side * 0x10), 0x18, 0x8, 0x118, offset});
}

uintptr_t getPlayerAddress(int side)
{
  return game.getAddress({(DWORD)PLAYER_STRUCT_BASE, (DWORD)(0x30 + side * 8)});
}

uintptr_t getMovesetAddress(uintptr_t playerAddr)
{
  return game.ReadUnsignedLong(playerAddr + MOVESET_OFFSET);
}

void scanAddresses()
{
  printf("Scanning for addresses...\n");
  uintptr_t addr = 0;
  uintptr_t base = game.getBaseAddress();
  uintptr_t start = base;

  addr = game.FastAoBScan(Tekken::PLAYER_STRUCT_SIG_BYTES, start + 0x5A00000);
  if (addr != 0)
  {
    start = addr; // To use as starting point for other scans

    // $1 + $2 + $3 - $4
    // $1 = Address at which the signature bytes were found
    // $2 = Length of the instruction where signature bytes were found
    // $3 = Relative offset to Player base address within the signature instruction
    // $4 = Game's base address
    PLAYER_STRUCT_BASE = addr + 7 + game.readUInt32(addr + 3) - base;
  }
  else
  {
    throw std::runtime_error("Match Struct Base Address not found!");
  }

  addr = game.FastAoBScan(Tekken::MOVSET_OFFSET_SIG_BYTES, base + 0x1800280);
  if (addr != 0)
  {
    MOVESET_OFFSET = game.readUInt32(addr + 3);
  }
  else
  {
    throw std::runtime_error("\"Moveset\" Offset not found!");
  }

  addr = game.FastAoBScan(Tekken::RAW_MOVESET_FILE_PTR_SIG_BYTES, base + 0x5800000);
  if (addr != 0)
  {
    RAW_MOVESET_BASE = addr + 11 + game.readUInt32(addr + 3) - base;
  }
  else
  {
    throw std::runtime_error("\"Raw Moveset Base\" Offset not found!");
  }

  printf("PLAYER_STRUCT_BASE: 0x%llX\n", PLAYER_STRUCT_BASE);
  printf("MOVESET_OFFSET: 0x%llX\n", MOVESET_OFFSET);
  printf("RAW_MOVESET_BASE: 0x%llX\n", RAW_MOVESET_BASE);
  printf("Addresses successfully scanned...\n");
}
