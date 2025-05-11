#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <map>
#include <stdexcept>

enum BossCodes {
  RegularJin, // 0
  NerfedJin, // 1
  MishimaJin, // 2
  KazamaJin, // 3
  FinalJin, // 4
  ChainedJin = 11,
  Azazel = 32,
  DevilKazuya = 97,
  AngelJin = 117,
  TrueDevilKazuya = 118,
  DevilJin = 121,
  FinalKazuya = 244,
  AmnesiaHeihachi = 351, // Heihachi (35), Variant # 1
  ShadowHeihachi = 352, // Heihachi (35), Variant # 2
  FinalHeihachi = 353, // Heihachi (35), Variant # 3
};

// Function to convert a hexadecimal string to uintptr_t
uintptr_t hexStringToUintptr(const std::string &hexStr)
{
  uintptr_t value;
  std::stringstream ss;
  ss << std::hex << hexStr;
  ss >> value;
  if (ss.fail())
  {
    throw std::invalid_argument("Invalid hex value: " + hexStr);
  }
  return value;
}

// Function to read key-value pairs from a file
std::map<std::string, uintptr_t> readKeyValuePairs(const std::string &filename)
{
  std::map<std::string, uintptr_t> keyValuePairs;
  std::ifstream file(filename);
  if (!file)
  {
    throw std::runtime_error("Failed to open file: " + filename);
  }

  std::string line;
  while (std::getline(file, line))
  {
    std::istringstream iss(line);
    std::string key, valueStr;
    if (std::getline(iss, key, '=') && std::getline(iss, valueStr))
    {
      uintptr_t value = hexStringToUintptr(valueStr);
      keyValuePairs[key] = value;
    }
  }

  return keyValuePairs;
}

uintptr_t getValueByKey(const std::map<std::string, uintptr_t> &config, const std::string &key)
{
  auto it = config.find(key);
  if (it != config.end())
  {
    return it->second;
  }
  else
  {
    throw std::runtime_error("Key not found: " + key);
  }
}

std::string getCharCode(int charId)
{
  switch (charId)
  {
  case 0: return "grf";
  case 1: return "pig";
  case 2: return "pgn";
  case 3: return "cml";
  case 4: return "snk";
  case 5: return "rat";
  case 6: return "ant";
  case 7: return "cht";
  case 8: return "grl";
  case 9: return "bsn";
  case 10: return "ccn";
  case 11: return "der";
  case 12: return "swl";
  case 13: return "klw";
  case 14: return "hms";
  case 15: return "kmd";
  case 16: return "ghp";
  case 17: return "lzd";
  case 18: return "mnt";
  case 19: return "ctr";
  case 20: return "hrs";
  case 21: return "kal";
  case 22: return "wlf";
  case 23: return "rbt";
  case 24: return "ttr";
  case 25: return "crw";
  case 26: return "jly";
  case 27: return "aml";
  case 28: return "zbn";
  case 29: return "cat";
  case 30: return "lon";
  case 31: return "bbn";
  case 32: return "got";
  case 33: return "dog";
  case 34: return "cbr";
  case 35: return "bee";
  case 36: return "okm";
  case 116: return "dek";
  case 117: return "xxa";
  case 118: return "xxb";
  case 119: return "xxc";
  case 120: return "xxd";
  case 121: return "xxe";
  case 122: return "xxf";
  case 123: return "xxg";
  default: return "Unknown";
  }
}

std::string getCharacterName(int id) {
  switch (id) {
    case 0: return "PAUL";
    case 1: return "LAW";
    case 2: return "KING";
    case 3: return "YOSHIMITSU";
    case 4: return "HWOARANG";
    case 5: return "XIAYOU";
    case 6: return "JIN";
    case 7: return "BRYAN";
    case 8: return "KAZUYA";
    case 9: return "STEVE";
    case 10: return "JACK8";
    case 11: return "ASUKA";
    case 12: return "DEVIL_JIN";
    case 13: return "FENG";
    case 14: return "LILI";
    case 15: return "DRAGUNOV";
    case 16: return "LEO";
    case 17: return "LARS";
    case 18: return "ALISA";
    case 19: return "CLAUDIO";
    case 20: return "SHAHEEN";
    case 21: return "NINA";
    case 22: return "LEE";
    case 23: return "KUMA";
    case 24: return "PANDA";
    case 25: return "ZAFINA";
    case 26: return "LEROY";
    case 27: return "JUN";
    case 28: return "REINA";
    case 29: return "AZUCENA";
    case 30: return "VICTOR";
    case 31: return "RAVEN";
    case 32: return "AZAZEL";
    case 33: return "EDDY";
    case 34: return "LIDIA";
    case 35: return "HEIHACHI";
    case 36: return "CLIVE";
    case 116: return "DUMMY";
    case 117: return "ANGEL_JIN";
    case 118: return "TRUE_DEVIL_KAZUYA";
    case 119: return "JACK7";
    case 120: return "SOLDIER";
    case 121: return "DEVIL_JIN_2";
    case 122: return "TEKKEN_MONK";
    case 123: return "SEIRYU";
    default: throw std::invalid_argument("Invalid character ID");
  }
}


std::string buildString(const char side, const std::string& code) {
    std::stringstream ss;
    ss << "T_UI_HUD_Character_Icon_" << side << "_" << code;
    return ss.str();
}

std::string getIconPath(int side, int charId)
{
  return buildString(side == 0 ? 'L' : 'R', getCharCode(charId));
}

std::string getNamePath(int charId)
{
  std::stringstream ss;
  ss << "T_UI_HUD_Character_Name_" << getCharCode(charId);
  return ss.str();
}

std::string getNamePath(const std::string& code)
{
  std::stringstream ss;
  ss << "T_UI_HUD_Character_Name_" << code;
  return ss.str();
}

std::string getBossName(int bossCode)
{
  switch (bossCode)
  {
  case BossCodes::RegularJin: return "Jin (Boosted)";
  case BossCodes::NerfedJin: return "Jin (Nerfed)";
  case BossCodes::ChainedJin: return "Jin (Chained)";
  case BossCodes::MishimaJin: return "Jin (Mishima)";
  case BossCodes::KazamaJin: return "Jin (Kazama)";
  case BossCodes::FinalJin: return "Jin (Ultimate)";
  case BossCodes::DevilKazuya: return "Kazuya (Devil)";
  case BossCodes::FinalKazuya: return "Kazuya (Final)";
  case BossCodes::AmnesiaHeihachi: return "Heihachi (Monk)";
  case BossCodes::ShadowHeihachi: return "Heihachi (Shadow)";
  case BossCodes::FinalHeihachi: return "Heihachi (Final)";
  case BossCodes::AngelJin: return "Jin (Angel)";
  case BossCodes::TrueDevilKazuya: return "Kazuya (True Devil)";
  case BossCodes::DevilJin: return "Jin (Devil)";
  case BossCodes::Azazel: return "Azazel";
  default: return "__unknown__";
  }
}
