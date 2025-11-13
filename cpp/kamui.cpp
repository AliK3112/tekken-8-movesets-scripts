#include "game.h"
#include "hash.h"

GameClass game;
uintptr_t PLAYER_STRUCT_BASE = 0x9B3E148;
uintptr_t MOVESET_OFFSET = 0x3718;
uintptr_t HASH_FUNC_OFFSET = 0x17D32A0;

std::string SIG_KAMUI_HASH = "48 85 C9 74 2E 53 48 83 EC 20 48 8B D9 48 8B 0D ?? ?? ?? ?? 48 85 C9 75 0C E8 ?? ?? ?? ?? 48 8B 0D ?? ?? ?? ?? 48 8B 01 48 8B D3 FF 50 40 48 83 C4 20 5B C3";

void print(const char* name, uintptr_t value);
uintptr_t getPlayerAddress(int side);
uintptr_t getMovesetAddress(uintptr_t playerAddr);

// int main()
// {
//   if (!game.Attach(L"Polaris-Win64-Shipping.exe")) {
//     return 1;
//   }
//   uintptr_t funcAddr = game.getBaseAddress() + HASH_FUNC_OFFSET;
//   uintptr_t player = getPlayerAddress(0);
//   uintptr_t moveset = getMovesetAddress(player);
//   print("funcAddr", funcAddr);
//   return 0;
// }

int main()
{
  // Expected: 0xe6151edf
  const char *input_string = "fbsdata/story_battle_voice_list.bin";
  uint64_t length = strlen(input_string);
  int64_t hash_value = ComputeKamuiHash((uint8_t *)input_string, length);
  printf("%s 0x%llx\n", input_string, hash_value);
  return 0;
}

void print(const char* name, uintptr_t value)
{
  printf("%s: 0x%llx\n", name, value);
}

uintptr_t getPlayerAddress(int side)
{
  if (!PLAYER_STRUCT_BASE) return 0;
  return game.getAddress({(DWORD)PLAYER_STRUCT_BASE, (DWORD)(0x30 + side * 8)});
}

uintptr_t getMovesetAddress(uintptr_t playerAddr)
{
  return playerAddr ? game.ReadUnsignedLong(playerAddr + MOVESET_OFFSET) : 0;
}