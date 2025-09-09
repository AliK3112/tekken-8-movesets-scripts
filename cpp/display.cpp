#include <windows.h>
#include <cstdio>
#include "game.h"
#include "tekken.h"

GameClass game;

uintptr_t PLAYER_STRUCT_BASE = 0;
uintptr_t MOVE_ID_OFFSET = 0x548;
uintptr_t FRAME_COUNTER_OFFSET = 0;

std::string FRAME_COUNTER_SIG_BYTES = "48 8B CE E8 ?? ?? ?? ?? 29 86 ?? ?? ?? 00 8B 8E ?? ?? ?? 00 BA FF FF 00 00 8D 41 01";

void scanAddresses();
uintptr_t getPlayerAddress(int side);

int main()
{
  if (game.Attach(L"Polaris-Win64-Shipping.exe"))
  {
    scanAddresses();

    uintptr_t players[2] = {
        getPlayerAddress(0),
        getPlayerAddress(1)};

    int moveId[2] = {0, 0};
    int frameCounter = 0, lastFrameCounter = 0;

    bool counting[2] = {false, false};
    int frame_count[2] = {0, 0};
    int last_length[2] = {0, 0};

    while (true)
    {
      frameCounter = game.readInt32(players[0] + FRAME_COUNTER_OFFSET);

      // Only tick once per actual frame
      if (frameCounter != lastFrameCounter)
      {
        lastFrameCounter = frameCounter;

        for (int i = 0; i < 2; i++)
        {
          moveId[i] = game.readInt32(players[i] + MOVE_ID_OFFSET);

          if (moveId[i] < 0x8000)
          {
            if (!counting[i])
            {
              counting[i] = true;
              frame_count[i] = 0;
            }
            frame_count[i]++;
          }
          else
          {
            if (counting[i])
            {
              counting[i] = false;
              last_length[i] = frame_count[i];
            }
          }
        }

        // Print both players’ last string lengths on the same line
        printf("\rLast Performed String: P1: %d frames | P2: %d frames", last_length[0], last_length[1]);
        fflush(stdout);
      }

      Sleep(10); // prevent pegging CPU
    }
  }
  return 0;
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

  // FRAME_COUNTER_OFFSET = 0x1388;
  addr = game.FastAoBScan(FRAME_COUNTER_SIG_BYTES, base + 0x1800000, base + 0x1E00000);
  if (addr != 0)
  {
    FRAME_COUNTER_OFFSET = game.readUInt32(addr + 16);
    printf("Frame Counter Offset: 0x%llX\n", FRAME_COUNTER_OFFSET);
  }
  else
  {
    throw std::runtime_error("Frame Counter Offset Address not found!");
  }

  printf("PLAYER_STRUCT_BASE: 0x%llX\n", PLAYER_STRUCT_BASE);
  printf("Addresses successfully scanned...\n");
}

uintptr_t getPlayerAddress(int side)
{
  return game.getAddress({(DWORD)PLAYER_STRUCT_BASE, (DWORD)(0x30 + side * 8)});
}
