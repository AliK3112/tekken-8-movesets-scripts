#include <iostream>
#include <stdint.h>

struct EncryptedValue
{
  uint64_t value;
  uint64_t key;
};

namespace Tekken
{
  namespace Offsets
  {
    enum Move
    {
      MoveNameKey = 0x0,
      AnimNameKey = 0x20,
      AnimAddr1 = 0x50,
      AnimAddr2 = 0x54,
      CancelList = 0x98,
      ExtraPropList = 0x138,
      StartPropList = 0x140,
      EndPropList = 0x148
    };

    enum Cancel
    {
      Command = 0x0,
      RequirementsList = 0x8,
      CancelExtradata = 0x10,
      WindowStart = 0x18,
      WindowEnd = 0x1C,
      TransitionFrame = 0x20,
      Move = 0x24,
      Option = 0x26
    };

    enum Moveset
    {
      ReactionsHeader = 0x168,
      ReactionsCount = 0x178,
      RequirementsHeader = 0x180,
      RequirementsCount = 0x188,
      HitConditionsHeader = 0x190,
      HitConditionsCount = 0x198,
      ProjectilesHeader = 0x1A0,
      ProjectilesCount = 0x1A8,
      PushbacksHeader = 0x1B0,
      PushbacksCount = 0x1B8,
      PushbackExtraDataHeader = 0x1C0,
      PushbackExtraDataCount = 0x1C8,
      CancelsHeader = 0x1D0,
      CancelsCount = 0x1D8,
      GroupCancelsHeader = 0x1E0,
      GroupCancelsCount = 0x1E8,
      CancelExtraDatasHeader = 0x1F0,
      CancelExtraDatasCount = 0x1F8,
      ExtraMovePropertiesHeader = 0x200,
      ExtraMovePropertiesCount = 0x208,
      MoveStartPropsHeader = 0x210,
      MoveStartPropsCount = 0x218,
      MoveEndPropsHeader = 0x220,
      MoveEndPropsCount = 0x228,
      MovesHeader = 0x230,
      MovesCount = 0x238,
      VoiceclipsHeader = 0x240,
      VoiceclipsCount = 0x248,
      InputSequencesHeader = 0x250,
      InputSequencesCount = 0x258,
      InputExtraDataHeader = 0x260,
      InputExtraDataCount = 0x268,
      ParryListHeader = 0x270,
      ParryListCount = 0x278,
      ThrowExtrasHeader = 0x280,
      ThrowExtrasCount = 0x288,
      ThrowsHeader = 0x290,
      ThrowsCount = 0x298,
      DialoguesHeader = 0x2A0,
      DialoguesCount = 0x2A8
    };

    enum ExtraProp
    {
      Type = 0x0,
      _0x4 = 0x4,
      RequirementAddr = 0x8,
      Prop = 0x10,
      Value = 0x14,
      Value2 = 0x18,
      Value3 = 0x1C,
      Value4 = 0x20,
      Value5 = 0x24
    };
  };

  namespace Sizes
  {
    enum Moveset
    {
      Pushback = 0x10,
      PushbackExtradata = 0x2,
      Requirement = 0x14,
      CancelExtradata = 0x4,
      Cancel = 0x28,
      ReactionList = 0x70,
      HitCondition = 0x18,
      ExtraMoveProperty = 0x28,
      OtherMoveProperty = 0x20,
      Move = 0x448,
      Voiceclip = 0xC,
      InputExtradata = 0x8,
      InputSequence = 0x10,
      Projectile = 0xD8,
      ThrowExtra = 0xC,
      Throw = 0x10,
      ParryList = 0x4,
      DialogueManager = 0x18
    };
  }

  std::string ENC_SIG_BYTES = "48 89 5C 24 08 57 48 83 EC 20 48 8B 59 08 48 8B 39 48 8B D3 48 8B CF E8 ?? ?? ?? ?? 48 3B C7 0F 85 ?? ?? ?? ?? 48 83 F7 1D 40 0F B6 C7 24 1F 76 20 0F B6 C8 0F 1F 40 00 0F 1F 84 00 00 00 00 00 48 8B C3 48 C1 E8 3F 48 8D 1C 58 48 83 E9 01 75 EF F3 0F 10 0D ?? ?? ?? ?? F3 0F 10 05 ?? ?? ?? ?? E8 ?? ?? ?? ?? F3 0F 10 0D ?? ?? ?? ?? 33 C0 0F 2F C1 72 16 F3 0F 5C C1 0F 2F C1 73 0D 48 B9 00 00 00 00 00 00 00 80 48 8B C1 48 83 E3 E0 33 D2 48 33 DF 48 C1 E3 20 F3 48 0F 2C C8 48 03 C8 48 8B C3 48 F7 F1 48 8B 5C 24 30 48 83 C4 20 5F C3 48 8B 5C 24 30 33 C0 48 83 C4 20 5F C3";

  std::string HUD_NAME_SIG_BYTES = "48 8B C8 4C 8B F0 E8 ?? ?? ?? ?? 84 C0 74 31 40 0F B6 CE";
  std::string HUD_ICON_SIG_BYTES = "48 8B C8 4C 8B F8 E8 ?? ?? ?? ?? 84 C0 74 52 80 BD 8A 00";
  std::string MOVSET_OFFSET_SIG_BYTES = "48 89 91 ?? ?? ?? 00 4C 8B D9 48 89 91 ?? ?? ?? 00 48 8B DA 48 89 91 ?? ?? ?? 00 48 89 91 ?? ?? ?? 00 0F B7 02 89 81 ?? ?? ?? 00 B8 01 80 00 80";
  std::string DEVIL_FLAG_SIG_BYTES = "00 83 B9 ?? ?? ?? 00 00 41 0F 95 C1 40 38 BB";
  std::string PLAYER_STRUCT_SIG_BYTES = "4C 89 35 ?? ?? ?? ?? 41 88 5E 28 66 41 89 9E 88 00 00 00 E8 ?? ?? ?? ?? 41 88 86 8A 00 00 00";
  std::string MATCH_STRUCT_SIG_BYTES = "48 8B 3D ?? ?? ?? ?? 48 89 7D 58 48 85 FF 0F 84";
  std::string RAW_MOVESET_FILE_PTR_SIG_BYTES = "48 C7 05 ?? ?? ?? ?? 00 00 00 00 48 8D 51 28 4C 8B 41 28 48 8B F9 48 83 C1 28 4D 8B 40 08 E8 ?? ?? ?? ?? 48 8B 4F 28 BA 30 00 00 00 E8 ?? ?? ?? ?? 4C 8B 47 18 48 8D 57 18 48 8D 4F 18 4D 8B 40 08 E8 ?? ?? ?? ?? 48 8B 4F 18";
  std::string MOVE_ID_SIG_BYTES = "CE 8B 96 ?? ?? 00 00 E8 ?? ?? ?? ?? 49 89 3E 4C 8B 74 24 ?? 48 3B 86 ?? ?? ?? ?? 0F 85";
  std::string MOVE_ADDR_SIG_BYTES = "48 8B 93 ?? ?? ?? ?? 4C 8D 44 24 20 48 83 C2 50 0F 28 DE 48 8B CF E8 ?? ?? ?? ?? 4C 8B C3";
  std::string NEXT_MOVE_ADDR_SIG_BYTES = "4C 39 A0 ?? ?? ?? ?? 0F 84 98 00 00 00 83 B8 ?? ?? ?? ?? 03 0F 84 8B 00 00 00 8B 88 ?? ?? ?? ?? 39 88 ?? ?? ?? ?? 7D 7D 8B 90 ?? ?? ?? ?? 48 8B C8";
  std::string CURRENT_MOVE_FRAME_SIG_BYTES = "8B 93 ?? ?? ?? ?? 3B C2 7F ?? 39 91 ?? ?? ?? ?? 7C ?? BA ?? ?? ?? ?? 85 C0 7E ?? 3B C2 0F 4F C2 EB ?? 33 C0 89 47 ?? 48 8B 83 ?? ?? ?? ?? 8B 88 ?? ?? ?? ?? 85 C9 7E ?? 3B CA 0F 4F CA";

  enum Requirements
  {
    CHARA_CONTROLLER = 228,
    STORY_BATTLE = 667,
    STORY_BATTLE_NUM = 668,
    INTRO_RELATED = 755,
    STORY_FLAGS = 777,
    DLC_STORY1_BATTLE = 801,
    DLC_STORY1_BATTLE_NUM = 802,
    DLC_STORY1_FLAGS = 806,
    PRE_ROUND_ANIM = 696,
    INTROS_RELATED = 697, // Intros related
    OUTRO1 = 675,         // Outro related 1
    OUTRO2 = 679,         // Outro related 2
    EOL = 1100,           // End of the list
  };

  enum ExtraMoveProperties
  {
    CHARA_TRAIL_VFX = 0x8039,
    DEVIL_STATE = 0x80dc,
    PERMA_DEVIL = 0x8151,
    SPEND_RAGE = 0x82e2,
    HEI_WARRIOR = 0x83f9,
    WING_ANIM = 0x8683,
  };

  enum FighterId
  {
    Paul = 0,
    Law,
    King,
    Yoshimitsu,
    Hwoarang,
    Xiayou,
    Jin,
    Bryan,
    Kazuya,
    Steve,
    Jack8,
    Asuka,
    DevilJin,
    Feng,
    Lili,
    Dragunov,
    Leo,
    Lars,
    Alisa,
    Claudio,
    Shaheen,
    Nina,
    Lee,
    Kuma,
    Panda,
    Zafina,
    Leroy,
    Jun,
    Reina,
    Azucena,
    Victor,
    Raven,
    Azazel,
    Eddy,
    Lidia,
    Heihachi,
    Clive,
    Anna,
    Dummy = 116,
    AngelJin,
    TrueDevilKazuya,
    Jack7,
    Soldier,
    DevilJin2,
    TekkenMonk,
    Seiryu
  };

  std::string getCharCode(int charId)
  {
    switch (charId)
    {
    case FighterId::Paul:
      return "grf";
    case FighterId::Law:
      return "pig";
    case FighterId::King:
      return "pgn";
    case FighterId::Yoshimitsu:
      return "cml";
    case FighterId::Hwoarang:
      return "snk";
    case FighterId::Xiayou:
      return "rat";
    case FighterId::Jin:
      return "ant";
    case FighterId::Bryan:
      return "cht";
    case FighterId::Kazuya:
      return "grl";
    case FighterId::Steve:
      return "bsn";
    case FighterId::Jack8:
      return "ccn";
    case FighterId::Asuka:
      return "der";
    case FighterId::DevilJin:
      return "swl";
    case FighterId::Feng:
      return "klw";
    case FighterId::Lili:
      return "hms";
    case FighterId::Dragunov:
      return "kmd";
    case FighterId::Leo:
      return "ghp";
    case FighterId::Lars:
      return "lzd";
    case FighterId::Alisa:
      return "mnt";
    case FighterId::Claudio:
      return "ctr";
    case FighterId::Shaheen:
      return "hrs";
    case FighterId::Nina:
      return "kal";
    case FighterId::Lee:
      return "wlf";
    case FighterId::Kuma:
      return "rbt";
    case FighterId::Panda:
      return "ttr";
    case FighterId::Zafina:
      return "crw";
    case FighterId::Leroy:
      return "jly";
    case FighterId::Jun:
      return "aml";
    case FighterId::Reina:
      return "zbn";
    case FighterId::Azucena:
      return "cat";
    case FighterId::Victor:
      return "lon";
    case FighterId::Raven:
      return "bbn";
    case FighterId::Azazel:
      return "got";
    case FighterId::Eddy:
      return "dog";
    case FighterId::Lidia:
      return "cbr";
    case FighterId::Heihachi:
      return "bee";
    case FighterId::Clive:
      return "okm";
    case FighterId::Anna:
      return "kgr";
    case FighterId::Dummy:
      return "dek";
    case FighterId::AngelJin:
      return "xxa";
    case FighterId::TrueDevilKazuya:
      return "xxb";
    case FighterId::Jack7:
      return "xxc";
    case FighterId::Soldier:
      return "xxd";
    case FighterId::DevilJin2:
      return "xxe";
    case FighterId::TekkenMonk:
      return "xxf";
    case FighterId::Seiryu:
      return "xxg";
    default:
      return "Unknown";
    }
  }

  std::string getCharacterName(int id)
  {
    switch (id)
    {
    case FighterId::Paul:
      return "PAUL";
    case FighterId::Law:
      return "LAW";
    case FighterId::King:
      return "KING";
    case FighterId::Yoshimitsu:
      return "YOSHIMITSU";
    case FighterId::Hwoarang:
      return "HWOARANG";
    case FighterId::Xiayou:
      return "XIAYOU";
    case FighterId::Jin:
      return "JIN";
    case FighterId::Bryan:
      return "BRYAN";
    case FighterId::Kazuya:
      return "KAZUYA";
    case FighterId::Steve:
      return "STEVE";
    case FighterId::Jack8:
      return "JACK8";
    case FighterId::Asuka:
      return "ASUKA";
    case FighterId::DevilJin:
      return "DEVIL_JIN";
    case FighterId::Feng:
      return "FENG";
    case FighterId::Lili:
      return "LILI";
    case FighterId::Dragunov:
      return "DRAGUNOV";
    case FighterId::Leo:
      return "LEO";
    case FighterId::Lars:
      return "LARS";
    case FighterId::Alisa:
      return "ALISA";
    case FighterId::Claudio:
      return "CLAUDIO";
    case FighterId::Shaheen:
      return "SHAHEEN";
    case FighterId::Nina:
      return "NINA";
    case FighterId::Lee:
      return "LEE";
    case FighterId::Kuma:
      return "KUMA";
    case FighterId::Panda:
      return "PANDA";
    case FighterId::Zafina:
      return "ZAFINA";
    case FighterId::Leroy:
      return "LEROY";
    case FighterId::Jun:
      return "JUN";
    case FighterId::Reina:
      return "REINA";
    case FighterId::Azucena:
      return "AZUCENA";
    case FighterId::Victor:
      return "VICTOR";
    case FighterId::Raven:
      return "RAVEN";
    case FighterId::Azazel:
      return "AZAZEL";
    case FighterId::Eddy:
      return "EDDY";
    case FighterId::Lidia:
      return "LIDIA";
    case FighterId::Heihachi:
      return "HEIHACHI";
    case FighterId::Clive:
      return "CLIVE";
    case FighterId::Anna:
      return "ANNA";
    case FighterId::Dummy:
      return "DUMMY";
    case FighterId::AngelJin:
      return "ANGEL_JIN";
    case FighterId::TrueDevilKazuya:
      return "TRUE_DEVIL_KAZUYA";
    case FighterId::Jack7:
      return "JACK7";
    case FighterId::Soldier:
      return "SOLDIER";
    case FighterId::DevilJin2:
      return "DEVIL_JIN_2";
    case FighterId::TekkenMonk:
      return "TEKKEN_MONK";
    case FighterId::Seiryu:
      return "SEIRYU";
    default:
      throw std::invalid_argument("Invalid character ID");
    }
  }

  // Expands a 32-bit integer to 64-bit with checksum, using a 64-bit key.
  int64_t expand32To64WithChecksum(uint32_t inputValue, uint64_t key)
  {
    uint32_t checksum = 0;
    uint32_t byteShift = 0;
    uint64_t shiftedInput = inputValue;

    while (byteShift < 32)
    {
      uint64_t tempKey = key;
      int shiftCount = static_cast<uint8_t>(byteShift + 8);

      while (shiftCount--)
      {
        tempKey = (tempKey >> 63) + 2 * tempKey; // Equivalent to a left shift with carry
      }

      checksum ^= static_cast<uint32_t>(shiftedInput) ^ static_cast<uint32_t>(tempKey);
      shiftedInput >>= 8;
      byteShift += 8;
    }

    return inputValue + ((checksum ? checksum : 1ull) << 32);
  }

  // Validates a 64-bit encrypted value and transforms it using a custom key-based algorithm.
  // This is the decryption method the game uses within movesets
  uint64_t validateAndTransform64BitValue(EncryptedValue *encrypted)
  {
    uint64_t key = encrypted->key;
    uint64_t encryptedValue = encrypted->value;

    // Validate the 64-bit value using the checksum function
    if (expand32To64WithChecksum(static_cast<uint32_t>(encryptedValue), key) != encryptedValue)
      return 0;

    // Scramble the value with a fixed XOR and calculate an offset
    uint64_t scrambledValue = encryptedValue ^ 0x1D;
    int bitOffset = scrambledValue & 0x1F;

    // Rotate the key left by bitOffset
    while (bitOffset--)
    {
      key = (key >> 63) + 2 * key;
    }

    // Normalize with float math
    float normalizer = 4294967296.0f; // 2^32
    uint64_t scaleOffset = 0;
    if (normalizer >= 9223372036854775800.0f)
    {
      normalizer -= 9223372036854775800.0f;
      if (normalizer < 9223372036854775800.0f)
        scaleOffset = 0x8000000000000000;
    }

    key &= 0xFFFFFFFFFFFFFFE0; // Clear lower 5 bits
    key ^= scrambledValue;
    key <<= 32;

    uint64_t divisor = scaleOffset + static_cast<uint64_t>(normalizer);
    return key / divisor;
  }

}
