#include "game.h"
#include "tekken.h"
#include <fstream>

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
int getCharIdFromMoveset(uintptr_t movesetAddr);
int getCharId(uintptr_t playerAddr) { return game.readInt32(playerAddr + 0x168); }
void scanAddresses();

std::string toLower(const std::string &input)
{
  std::string result = input;
  for (char &c : result)
  {
    if (c >= 'A' && c <= 'Z')
    {
      c += 'a' - 'A';
    }
  }
  return result;
}

int main()
{
  // Toggle this flag to control which version gets dumped
  bool dumpPopulatedMoveset = true;

  if (game.Attach(L"Polaris-Win64-Shipping.exe"))
  {
    scanAddresses();

    int player = 0;
    uintptr_t targetAddress = 0;
    uintptr_t fileSize = 0;
    char targetFileName[255];

    if (dumpPopulatedMoveset)
    {
      // Populated moveset logic
      uintptr_t playerAddr = getPlayerAddress(player);
      targetAddress = getMovesetAddress(playerAddr);
      fileSize = getRawMovesetAddress(player, RawFile::Size); // Reuse size from raw layout

      // Putting moveset address at 0x10 since we know that offset is always 0
      // This saves the additional 16 bytes from appending
      game.write<uintptr_t>(targetAddress + 0x10, targetAddress);
    }
    else
    {
      // Raw moveset logic
      targetAddress = getRawMovesetAddress(player, RawFile::Address);
      fileSize = getRawMovesetAddress(player, RawFile::Size);
    }

    // Preparing file name
    int charId = getCharIdFromMoveset(targetAddress);
    const char* charName = toLower(Tekken::getCharacterName(charId)).c_str();
    sprintf_s(targetFileName, "%s_moveset%s.bin", charName, (dumpPopulatedMoveset ? "" : "_raw"));

    printf("Dumping from 0x%llx (%llu bytes)\n", targetAddress, fileSize);

    // Read memory from game
    std::vector<uint8_t> data = game.readArray<uint8_t>(targetAddress, fileSize);
    if (!data.empty())
    {
      std::ofstream outFile(targetFileName, std::ios::binary);

      if (dumpPopulatedMoveset) // Redundant logic
      {
        // Write 8-byte address (little endian)
        // outFile.write(reinterpret_cast<const char *>(&targetAddress), sizeof(uintptr_t));

        // Write 8-byte size (little endian)
        // outFile.write(reinterpret_cast<const char *>(&fileSize), sizeof(uint64_t));
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

int getCharIdFromMoveset(uintptr_t movesetAddr)
{
  return (game.readInt32(movesetAddr + 0x160) - 1) / 0xFFFFu;
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
