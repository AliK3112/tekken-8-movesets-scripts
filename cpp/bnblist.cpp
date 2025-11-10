#include "game.h"
#include <fstream>

GameClass game;
uintptr_t _ADDR = 0x151E70000;
uintptr_t _SIZE = 0x8380;

int main()
{
  if (game.Attach(L"Polaris-Win64-Shipping.exe"))
  {
    std::string fileName = "toc.bin";
    std::vector<uint8_t> data = game.readArray<uint8_t>(_ADDR, _SIZE);
    if (data.empty())
    {
      std::cerr << "Error: Failed to read moveset data.\n";
    }

    std::ofstream outFile(fileName, std::ios::binary);
    auto _data = data.data();
    auto _size = data.size();
    outFile.write(reinterpret_cast<const char*>(_data), _size);
    outFile.close();

    printf("TOC dumped to %s.\n", fileName.c_str());
  }
  return 0;
}