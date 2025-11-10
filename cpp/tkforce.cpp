// Loads Kazuya as an opponent in TKFORCE
#include "game.h"
#include "utils.h"
#include "tekken.h"

GameClass game;
uintptr_t MATCH_STRUCT_BASE = 0x9B38DB8;
std::string JIN_P1 = "/Game/Character/Item/Customize_Set/ant/CS_ant_1p.CS_ant_1p";
std::string KAZ_P1 = "/Game/Character/Item/Customize_Set/grl/CS_grl_1p.CS_grl_1p";
std::string KAZ_P3 = "/Game/Demo/Story/Sets/CS_grl_1p_v2_white.CS_grl_1p_v2_white";

uintptr_t getPlayerAddr(uintptr_t matchStructAddr, int playerId);
int getCharId(uintptr_t matchStructAddr, int playerId);
bool setStartingHealth(uintptr_t matchStructAddr, int playerId, int health);
bool setCharId(uintptr_t matchStructAddr, int playerId, int charId);
bool setCostume(uintptr_t matchStructAddr, int playerId, std::string costume);

int main()
{
  if (!game.Attach(L"Polaris-Win64-Shipping.exe"))
  {
    return 1;
  }
  const std::vector<DWORD> offsets = {(DWORD)MATCH_STRUCT_BASE, 0x50, 0x8, 0x18, 0x8};
  uintptr_t matchStructAddr = 0;
  while (true)
  {
    Sleep(100);
    matchStructAddr = game.getAddress(offsets);
    if (matchStructAddr == 0)
    {
      continue;
    }
    int targetId = Tekken::FighterId::Lidia;
    for (int i = 1; i < 30; i++)
    {
      int currCharId = getCharId(matchStructAddr, i);
      // if (i == 26 || i == 27)
      // {
      //   continue;
      // }
      // printf("Player %d: Current Char: %s\n", i + 1, getCharacterName(currCharId).c_str());
      setStartingHealth(matchStructAddr, i, 10);
      // setCharId(matchStructAddr, i, targetId);
      // setCostume(matchStructAddr, i, getCostumePath(targetId));
      // setCostume(matchStructAddr, i, KAZ_P3);
    }
    // break;
  }
  return 0;
}

uintptr_t getPlayerAddr(uintptr_t matchStructAddr, int playerId)
{
  if (matchStructAddr == 0)
  {
    return 0;
  }
  uintptr_t playerAddr = 0;
  if (playerId >= 2)
  {
    return matchStructAddr + (playerId - 2) * 0x84 + 0x17180;
  }
  if (playerId < 3)
  {
    return matchStructAddr + playerId * 0x84 + 0x10;
  }
  return 0;
}

int getCharId(uintptr_t matchStructAddr, int playerId)
{
  if (matchStructAddr == 0)
  {
    return 255;
  }
  uintptr_t charIdAddr = getPlayerAddr(matchStructAddr, playerId);
  // printf("Player %d: charIdAddr: 0x%llx\n", playerId + 1, charIdAddr);
  if (charIdAddr)
  {
    return game.readInt32(charIdAddr);
  }
  return 0;
}

bool setStartingHealth(uintptr_t matchStructAddr, int playerId, int health)
{
  if (matchStructAddr == 0 || health < 0 || playerId < 0)
  {
    return false;
  }
  uintptr_t healthAddr = getPlayerAddr(matchStructAddr, playerId);
  if (!healthAddr)
  {
    return false;
  }
  healthAddr += 0xC;
  try
  {
    // printf("Player ID: %d, Health Addr: 0x%llx\n", playerId + 1, healthAddr);
    game.write<int>(healthAddr, health);
    return true;
  }
  catch (...)
  {
    return false;
  }
}

bool setCharId(uintptr_t matchStructAddr, int playerId, int charId)
{
  if (matchStructAddr == 0 || charId < 0 || charId == 255 || playerId < 0)
  {
    return false;
  }
  uintptr_t charIdAddr = getPlayerAddr(matchStructAddr, playerId);
  try
  {
    // printf("Player ID: %d, Char ID Addr: 0x%llx\n", playerId + 1, charIdAddr);
    game.write<int>(charIdAddr, charId);
    return true;
  }
  catch (...)
  {
    return false;
  }
}

bool setCostume(uintptr_t matchStructAddr, int playerId, std::string costume)
{
  if (!matchStructAddr)
  {
    return false;
  }
  uintptr_t costumeAddr = matchStructAddr + 0x13D78 + playerId * 0x100;
  // printf("Player ID: %d, Costume Addr: 0x%llx\n", playerId + 1, costumeAddr);
  try
  {
    game.writeString(costumeAddr, costume);
    return true;
  }
  catch (...)
  {
    return false;
  }
}