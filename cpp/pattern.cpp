#include "game.h"
#include "tekken.h"
#include <conio.h>
#include <chrono>

/**
 * Compile with: g++ -O2 -s -static -o pattern.exe pattern.cpp
 * Run with pattern.exe
 */

GameClass game;

uintptr_t scanForOffset(std::string pattern, uintptr_t start = 0, uintptr_t end = 0)
{
  uintptr_t addr = game.FastAoBScan(pattern, start, end);
  return addr - game.getBaseAddress();
}

uintptr_t readOffsetFromInstr(uintptr_t instrAddr, int instrLen)
{
  return instrAddr + instrLen + game.readUInt32(instrAddr + 3) - game.getBaseAddress();
}

uintptr_t readOffsetFromInstr(uintptr_t instrAddr)
{
  return game.readUInt32(instrAddr + 3);
}

int main()
{
  if (game.Attach(L"Polaris-Win64-Shipping.exe"))
  {
    printf("Press any key to scan\n");
    _getch();
    auto start = std::chrono::high_resolution_clock::now(); // Start timer
    uintptr_t addr = 0;
    uintptr_t base = game.getBaseAddress();
    uintptr_t startAddr = base;

    // Player Struct Base Address
    addr = scanForOffset(Tekken::PLAYER_STRUCT_SIG_BYTES, startAddr + 0x5A00000);
    startAddr = startAddr + addr;
    printf("player_struct_base_addr_offset=0x%llX\n", addr);
    printf("player_struct_base=0x%llX\n", readOffsetFromInstr(addr + base, 7));

    // Match Struct Base Address
    addr = scanForOffset(Tekken::MATCH_STRUCT_SIG_BYTES, startAddr);
    printf("match_struct_base_addr_offset=0x%llX\n", addr);
    printf("match_struct_base=0x%llX\n", readOffsetFromInstr(addr + base, 7));

    // Encryption Method
    addr = scanForOffset(Tekken::ENC_SIG_BYTES, game.getBaseAddress() + 0x1700000);
    printf("decryption_function_offset=0x%llX\n", addr);

    // HUD Icon
    addr = scanForOffset(Tekken::HUD_ICON_SIG_BYTES, startAddr);
    addr += 13;
    printf("hud_icon_addr_offset=0x%llX\n", addr);

    // HUD Name
    addr = scanForOffset(Tekken::HUD_NAME_SIG_BYTES, addr + 0x10, addr + 0x1000);
    addr += 13;
    printf("hud_name_addr_offset=0x%llX\n", addr);

    // Moveset Offset
    addr = scanForOffset(Tekken::MOVSET_OFFSET_SIG_BYTES, game.getBaseAddress() + 0x1800000);
    printf("moveset_offset_addr_offset=0x%llX\n", addr);
    printf("moveset_offset=0x%llX\n", readOffsetFromInstr(addr + base));

    // Devil Flag Offset
    addr = scanForOffset(Tekken::DEVIL_FLAG_SIG_BYTES, game.getBaseAddress() + 0x2C00000);
    // addr = game.readInt32(addr + 3);
    printf("permanent_devil_offset_addr_offset=0x%llX\n", addr);
    printf("permanent_devil_offset=0x%llX\n", readOffsetFromInstr(addr + base));

    auto end = std::chrono::high_resolution_clock::now(); // End timer

    // Calculate elapsed time in milliseconds
    std::chrono::duration<double, std::milli> elapsed = end - start;

    printf("Time taken: %lfs\n", (elapsed.count() / 1000.0));
  }
  printf("Press any key to close\n");
  _getch();
  return 0;
}
