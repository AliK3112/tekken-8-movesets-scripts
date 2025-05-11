#include "game.h"
#include <fstream>

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
  // Toggle this flag to control which version gets dumped
  bool dumpPopulatedMoveset = true;

  if (game.Attach(L"Polaris-Win64-Shipping.exe"))
  {
    int player = 0;
    uintptr_t targetAddress = 0;
    size_t fileSize = 0;
    const char *targetFileName = nullptr;

    if (dumpPopulatedMoveset)
    {
      // Populated moveset logic
      uintptr_t playerAddr = getPlayerAddress(player);
      targetAddress = getMovesetAddress(playerAddr);
      fileSize = getRawMovesetAddress(player, RawFile::Size); // Reuse size from raw layout
      targetFileName = "kazuya_moveset.bin";
    }
    else
    {
      // Raw moveset logic
      targetAddress = getRawMovesetAddress(player, RawFile::Address);
      fileSize = getRawMovesetAddress(player, RawFile::Size);
      targetFileName = "raw_moveset.bin";
    }

    printf("Dumping from 0x%llx (%llu bytes)\n", targetAddress, fileSize);

    // Read memory from game
    std::vector<uint8_t> data = game.readArray<uint8_t>(targetAddress, fileSize);
    if (!data.empty())
    {
      std::ofstream outFile(targetFileName, std::ios::binary);

      if (dumpPopulatedMoveset)
      {
        // Write 8-byte address (little endian)
        outFile.write(reinterpret_cast<const char *>(&targetAddress), sizeof(uintptr_t));

        // Write 8-byte size (little endian)
        uint64_t size64 = static_cast<uint64_t>(fileSize);
        outFile.write(reinterpret_cast<const char *>(&size64), sizeof(uint64_t));
      }

      // Write the actual data
      outFile.write(reinterpret_cast<const char *>(data.data()), data.size());
      outFile.close();

      printf("Dump successful: %s\n", targetFileName);
    }
    else
    {
      printf("Failed to read memory at 0x%llx\n", targetAddress);
    }
  }
  else
  {
    printf("Failed to attach to the game.\n");
  }

  return 0;
}

uintptr_t getRawMovesetAddress(int side, DWORD offset)
{
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
