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

uintptr_t PLAYER_STRUCT_BASE = 0x09AB9928;
uintptr_t MOVESET_OFFSET = 0x3538;

uintptr_t getRawMovesetAddress(int side, DWORD offset);
uintptr_t getMovesetAddress(uintptr_t playerAddr);
uintptr_t getPlayerAddress(int side);

int main()
{
  if (game.Attach(L"Polaris-Win64-Shipping.exe"))
  {
    int player = 0;
    uintptr_t rawMoveset = getRawMovesetAddress(player, RawFile::Address);
    uintptr_t fileSize = getRawMovesetAddress(player, RawFile::Size);
    printf("0x%llx %d bytes\n", rawMoveset, fileSize);
    return 0;

    uintptr_t moveset = getMovesetAddress(getPlayerAddress(player));
    uintptr_t movelist = game.readUInt64(moveset + Tekken::Offsets::MovesHeader);
    int count = game.readUInt64(moveset + Tekken::Offsets::MovesCount);
    uintptr_t addr = movelist;
    EncryptedValue encrypted;

    auto calcOffset = [&](uintptr_t relativeAddr) -> uintptr_t
    {
      return (relativeAddr - moveset) + rawMoveset;
    };

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
      printf("%-5d ", nameLen - 1);
      printf("%-5d ", animNameLen - 1);
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
  // TODO: Change first offset in the future
  return game.getAddress({0x09AB2B08, 0x68, (DWORD)(0x2D0 + side * 0x10), 0x18, 0x8, 0x118, offset});
}

uintptr_t getPlayerAddress(int side)
{
  return game.getAddress({(DWORD)PLAYER_STRUCT_BASE, (DWORD)(0x30 + side * 8)});
}

uintptr_t getMovesetAddress(uintptr_t playerAddr)
{
  return game.ReadUnsignedLong(playerAddr + MOVESET_OFFSET);
}
