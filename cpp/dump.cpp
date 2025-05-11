#include <filesystem>
#include "game.h"
#include "utils.h"

using namespace std;

GameClass Game;
uintptr_t PLAYER_STRUCT_BASE = 0x09B15B38;
uintptr_t MOVESET_OFFSET = 0x3308;

uintptr_t getPlayerAddress(int side);
uintptr_t getMovesetAddress(uintptr_t player);
bool movesetExists(uintptr_t moveset);
uint64_t getMovesetSize(uintptr_t moveset);
bool dumpMovesetToFile(const std::string &fileName, uintptr_t moveset, uint64_t size);

int main()
{
  if (Game.Attach(L"Polaris-Win64-Shipping.exe"))
  {
    while (true)
    {
      Sleep(1000);
      for (int side = 0; side < 2; side++)
      {
        uintptr_t player = getPlayerAddress(side);
        // printf("player - 0x%llx\n", player);
        if (!player)
          break;
        uintptr_t moveset = getMovesetAddress(player);
        // printf("moveset - 0x%llx\n", moveset);
        if (!moveset)
          break;
        if (!movesetExists(moveset))
          break;

        int charId = Game.readInt32(player + 0x168);
        std::string charName = getCharacterName(charId);
        std::string fileName = "extracted_chars/t8_" + charName + ".bin";
        uint64_t size = getMovesetSize(moveset);
        // printf("%s %lld bytes\n", charName.c_str(), size);

        dumpMovesetToFile(fileName, moveset, size);
      }
      // return 0;
    }
  }
  return 0;
}

uintptr_t getPlayerAddress(int side)
{
  return Game.getAddress({(DWORD)(PLAYER_STRUCT_BASE), (DWORD)(0x30 + side * 8)});
}

uintptr_t getMovesetAddress(uintptr_t player)
{
  return Game.readUInt64(player + MOVESET_OFFSET);
}

bool movesetExists(uintptr_t moveset)
{
  return Game.ReadString(moveset + 8, 3).compare("TEK") == 0;
}

uint64_t getMovesetSize(uintptr_t moveset)
{
  uintptr_t dialogues = Game.readUInt64(moveset + 0x2A0);
  uintptr_t count = Game.readUInt64(moveset + 0x2A8);
  return (dialogues + 0x18 * count) - moveset;
}

bool dumpMovesetToFile(const std::string &fileName, uintptr_t moveset, uint64_t size)
{
  // Check if file already exists
  if (std::filesystem::exists(fileName))
  {
    // printf("File %s already exists. Skipping dump.\n", fileName.c_str());
    return false;
  }

  // Create directory if it doesn't exist
  std::filesystem::create_directories("extracted_chars");

  // Open file for binary writing
  std::ofstream outFile(fileName, std::ios::binary);
  if (!outFile.is_open())
  {
    std::cerr << "Error: Could not open file " << fileName << " for writing.\n";
    return false;
  }

  // Write moveset address at offset 0x0
  outFile.write(reinterpret_cast<const char *>(&moveset), sizeof(moveset));

  // Write moveset size at offset 0x8
  outFile.write(reinterpret_cast<const char *>(&size), sizeof(size));

  // Read and write the actual moveset data
  std::vector<uint8_t> movesetData = Game.readArray<uint8_t>(moveset, size);
  if (movesetData.empty())
  {
    std::cerr << "Error: Failed to read moveset data.\n";
    outFile.close();
    std::filesystem::remove(fileName); // Clean up partial file
    return false;
  }

  outFile.write(reinterpret_cast<const char *>(movesetData.data()), movesetData.size());
  outFile.close();

  printf("Moveset dumped to %s.\n", fileName.c_str());
  return true;
}
