#include <filesystem>
#include <fstream>
#include "game.h"
#include "tekken.h"

enum RawFile
{
  Address = 0x0,
  Size = 0x8,
};

GameClass game;

uintptr_t PLAYER_STRUCT_BASE = 0;
uintptr_t MOVESET_OFFSET = 0;
uintptr_t RAW_MOVESET_BASE = 0;

int dumpMoveset(int player, bool dumpPopulatedMoveset);
uintptr_t getRawMovesetAddress(int targetCharId, DWORD offset);
uintptr_t getMovesetAddress(uintptr_t playerAddr);
uintptr_t getPlayerAddress(int side);
int getCharIdFromMoveset(uintptr_t movesetAddr);
int getCharId(uintptr_t playerAddr) { return playerAddr ? game.readInt32(playerAddr + 0x168) : -1; }
void scanAddresses();
bool movesetExists(uintptr_t moveset);
uint64_t getMovesetSize(uintptr_t moveset);
void carryValues(int player, uintptr_t moveset);

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

std::string prepareFilePath(int charId, bool flag)
{
  std::string charName = toLower(Tekken::getCharacterName(charId));
  char buffer[255];
  sprintf_s(buffer, "extracted_chars/t8_%d_%s_moveset%s.bin", charId, charName.c_str(), (flag ? "" : "_raw"));
  return std::string(buffer);
}

int main()
{
  if (game.Attach(L"Polaris-Win64-Shipping.exe"))
  {
    scanAddresses();
    uintptr_t player = 0;
    uintptr_t moveset = 0;
    std::string filePath = "\0";
    while (true)
    {
      Sleep(1000);
      for (int side = 0; side < 2; side++)
      {
        player = getPlayerAddress(side);
        if (!player)
          break;
        moveset = getMovesetAddress(player);
        if (!moveset)
          break;
        if (!movesetExists(moveset))
          break;
        int charId = getCharId(player);
        std::filesystem::create_directories("extracted_chars");
        if (!std::filesystem::exists(prepareFilePath(charId, true)))
        {
          dumpMoveset(side, true);
          break;
        }
        // if (!std::filesystem::exists(prepareFilePath(charId, false)))
        // {
        //   if (side == 0)
        //     dumpMoveset(side, false);
        // }
        // dumpMoveset(side, true);
        // break;
      }
      // break;
    }
  }
  return 0;
}

int dumpMoveset(int player, bool dumpPopulatedMoveset)
{
  uintptr_t targetAddress = 0;
  uint64_t fileSize = 0;
  std::string filePath;
  // char *targetFileName = nullptr;

  if (dumpPopulatedMoveset)
  {
    // Populated moveset logic
    uintptr_t playerAddr = getPlayerAddress(player);
    targetAddress = getMovesetAddress(playerAddr);
    fileSize = getMovesetSize(targetAddress);

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

  // Carry over some data from raw moveset to populated moveset
  if (dumpPopulatedMoveset)
  {
    carryValues(player, targetAddress);
  }

  // Preparing filename
  int charId = getCharIdFromMoveset(targetAddress);
  const char *targetFileName = prepareFilePath(charId, dumpPopulatedMoveset).c_str();

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

    printf("Dump successful: %s (%llu bytes)\n", targetFileName, fileSize);
  }
  else
  {
    printf("Failed to read memory at 0x%llx\n", targetAddress);
  }

  return 0;
}

uintptr_t getRawMovesetAddress(int targetCharId, DWORD offset)
{
  DWORD base = static_cast<DWORD>(RAW_MOVESET_BASE);

  std::vector<std::vector<DWORD>> addressPaths = {
      {base, 0x18, 0x60, 0x18, 0x8, 0x118, offset},
      {base, 0x18, 0x60, 0x0, 0x18, 0x8, 0x140, 0x20 + offset},
      {base, 0x18, 0x68, 0x18, 0x8, 0x140, 0x20 + offset}};

  for (const auto &path : addressPaths)
  {
    uintptr_t addr = game.getAddress(path);
    if (getCharIdFromMoveset(addr) == targetCharId)
    {
      return addr;
    }
  }

  return 0; // Not found
}

uintptr_t getPlayerAddress(int side)
{
  if (side != 0 && side != 1)
    return 0;
  return game.getAddress({(DWORD)PLAYER_STRUCT_BASE, (DWORD)(0x30 + side * 8)});
}

uintptr_t getMovesetAddress(uintptr_t playerAddr)
{
  return playerAddr ? game.ReadUnsignedLong(playerAddr + MOVESET_OFFSET) : 0;
}

int getCharIdFromMoveset(uintptr_t movesetAddr)
{
  int id = movesetAddr ? ((game.readInt32(movesetAddr + 0x160) - 1) / 0xFFFFu) : -1;
  return id == 128 ? 116 : id; // Handling the case for Dummy
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

bool movesetExists(uintptr_t moveset)
{
  return moveset ? game.ReadString(moveset + 8, 3).compare("TEK") == 0 : 0;
}

uint64_t getMovesetSize(uintptr_t moveset)
{
  if (!moveset)
    return 0;
  uintptr_t dialogues = game.readUInt64(moveset + 0x2A0);
  uintptr_t count = game.readUInt64(moveset + 0x2A8);
  return (dialogues + 0x18 * count) - moveset;
}

void carryValues(int player, uintptr_t moveset)
{
  int charId = getCharId(getPlayerAddress(player));
  uintptr_t rawMoveset = getRawMovesetAddress(charId, RawFile::Address);

  if (!rawMoveset)
  {
    printf("Raw Moveset File ID mismatch for Character %s\n", Tekken::getCharacterName(charId).c_str());
    return;
  }

  // Putting moveset address at 0x10 since we know that offset is always 0
  // This saves the additional 16 bytes from appending
  game.write<uintptr_t>(moveset + 0x10, moveset);                                   // Char Name
  game.write<uintptr_t>(moveset + 0x18, game.read<uintptr_t>(rawMoveset + 0x18));   // Creator Name
  game.write<uintptr_t>(moveset + 0x20, game.read<uintptr_t>(rawMoveset + 0x20));   // Date
  game.write<uintptr_t>(moveset + 0x28, game.read<uintptr_t>(rawMoveset + 0x28));   // Full Date
  game.write<uintptr_t>(moveset + 0x170, game.read<uintptr_t>(rawMoveset + 0x170)); // String Block End

  // Going through the moves array and copying offsets
  uintptr_t start = game.read<uintptr_t>(moveset + 0x230);
  uintptr_t count = game.read<uintptr_t>(moveset + 0x238);
  uintptr_t rawAddr = 0, addr = 0;
  for (uintptr_t i = 0; i < count; i++)
  {
    addr = start + i * 0x448;
    rawAddr = (addr - moveset) + rawMoveset;
    game.write<uint64_t>(addr + 0x40, game.read<uint64_t>(rawAddr + 0x40)); // Move Name
    game.write<uint64_t>(addr + 0x48, game.read<uint64_t>(rawAddr + 0x48)); // Anim Name
  }
}