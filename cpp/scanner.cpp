// For scanning moveset extractor addresses
#include "game.h"
#include "tekken.h"
#include <conio.h>

/**
 * Compile with: g++ -O2 -s -static -o scanner.exe scanner.cpp
 * Run with ./scanner.exe
 */

GameClass game;

uintptr_t scanForOffset(std::string pattern, uintptr_t start = 0, uintptr_t end = 0)
{
  uintptr_t addr = game.FastAoBScan(pattern, start, end);
  return addr - game.getBaseAddress();
}

uintptr_t calculateOffsetFromInstr(uintptr_t instrAddr, int instrLen)
{
  return instrAddr + instrLen + game.readUInt32(instrAddr + 3) - game.getBaseAddress();
}

uintptr_t readOffsetFromInstr(uintptr_t instrAddr, int distance = 3)
{
  return game.readUInt32(instrAddr + distance);
}

int main()
{
  if (!game.Attach(L"Polaris-Win64-Shipping.exe"))
  {
    printf("Failed to attached to game!\n");
  }
  uintptr_t addr = 0;
  uintptr_t base = game.getBaseAddress();
  uintptr_t startAddr = base;

  // Player Struct Base Address
  addr = scanForOffset(Tekken::PLAYER_STRUCT_SIG_BYTES, startAddr + 0x5A00000);
  startAddr = startAddr + addr;
  // printf("t8_p1_addr_offset=0x%llX\n", addr);
  printf("t8_p1_addr=+0x%llX\n", calculateOffsetFromInstr(addr + base, 7));

  // Moveset Offset
  addr = scanForOffset(Tekken::MOVSET_OFFSET_SIG_BYTES, game.getBaseAddress() + 0x1800000);
  // printf("t8_motbin_offset_addr_offset=0x%llX\n", addr);
  printf("t8_motbin_offset=0x%llX\n", readOffsetFromInstr(addr + base));

  addr = scanForOffset(Tekken::MOVE_ADDR_SIG_BYTES, game.getBaseAddress() + 0x1800000);
  printf("player_curr_move_addr_offset=0x%llX\n", readOffsetFromInstr(addr + base));

  addr = scanForOffset(Tekken::MOVE_ID_SIG_BYTES, game.getBaseAddress() + 0x1800000);
  printf("player_curr_move_offset=0x%llX\n", readOffsetFromInstr(addr + base));

  addr = scanForOffset(Tekken::NEXT_MOVE_ADDR_SIG_BYTES, game.getBaseAddress() + 0x1800000);
  printf("next_move_offset=0x%llX\n", readOffsetFromInstr(addr + base, 0x49));

  addr = scanForOffset(Tekken::CURRENT_MOVE_FRAME_SIG_BYTES, game.getBaseAddress() + 0x1800000);
  printf("curr_frame_timer_offset=0x%llX\n", readOffsetFromInstr(addr + base, 2));

  printf("Press any key to close\n");
  _getch();
  return 0;
}