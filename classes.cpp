typedef unsigned long long uint64_t;
typedef unsigned int uint32_t;
typedef int int32_t;
typedef unsigned short uint16_t;
typedef short int16_t;
typedef unsigned char uint8_t;

// Size: 0x04
union tk_param
{
  uint32_t param_unsigned;
  int32_t param_signed;
  float param_float;
};

// Size: 0x14
struct tk_requirement
{
  uint32_t req;
  tk_param params[4];
};

// Size: 0x04
struct tk_pushback_extradata
{
  int16_t displacement;
};

// Size: 0x10
struct tk_pushback
{
  uint16_t non_linear_displacement;
  uint16_t non_linear_distance;
  uint32_t num_of_extra_pushbacks;
  tk_pushback_extradata *pushback_extradata;
};

// Size: 0x70
struct tk_reaction
{
  // Array
  tk_pushback *front_pushback;
  tk_pushback *backturned_pushback;
  tk_pushback *left_side_pushback;
  tk_pushback *right_side_pushback;
  tk_pushback *front_counterhit_pushback; // If you ever wondered why your CH launcher didn't launch after a sidestep, that's why
  tk_pushback *downed_pushback;
  tk_pushback *block_pushback;

  // Directions
  uint16_t front_direction;            // Offset: 0x38
  uint16_t back_direction;             // Offset: 0x3a
  uint16_t left_side_direction;        // Offset: 0x3c
  uint16_t right_side_direction;       // Offset: 0x3e
  uint16_t front_counterhit_direction; // Offset: 0x40
  uint16_t downed_direction;           // Offset: 0x42

  // Rotations
  uint16_t front_rotation;      // Offset: 0x44
  uint16_t back_rotation;       // Offset: 0x46
  uint16_t left_side_rotation;  // Offset: 0x48
  uint16_t right_side_rotation; // Offset: 0x4a
  uint16_t vertical_pushback;   // Offset: 0x4c (a.k.a front_counterhit_rotation)
  uint16_t downed_rotation;     // Offset: 0x4e

  // Move IDs
  uint16_t standing;          // Offset: 0x50
  uint16_t crouch;            // Offset: 0x52
  uint16_t ch;                // Offset: 0x54
  uint16_t crouch_ch;         // Offset: 0x56
  uint16_t left_side;         // Offset: 0x58
  uint16_t left_side_crouch;  // Offset: 0x5a
  uint16_t right_side;        // Offset: 0x5c
  uint16_t right_side_crouch; // Offset: 0x5e
  uint16_t back;              // Offset: 0x60
  uint16_t back_crouch;       // Offset: 0x62
  uint16_t block;             // Offset: 0x64
  uint16_t crouch_block;      // Offset: 0x66
  uint16_t wallslump;         // Offset: 0x68
  uint16_t downed;            // Offset: 0x6a
};

// Size: 0x04
struct tk_cancel_extradata
{
  uint32_t value;
};

// Size: 0x28
struct tk_cancel
{
  uint64_t command;
  tk_requirement *requirements;
  tk_cancel_extradata *extradata;
  uint32_t input_window_start;
  uint32_t input_window_end;
  uint32_t starting_frame;
  uint16_t move_id;
  uint16_t option;
};

// Size: 0x18
struct tk_hit_condition
{
  tk_requirement *requirements;
  uint32_t damage;
  tk_reaction *reaction;
};

// Size: 0x28
struct tk_extraprops
{
  uint32_t frame;
  tk_requirement *requirements;
  uint32_t property;
  tk_param params[4];
};

// Size: 0x20
struct tk_frameless_props
{
  tk_requirement *requirements;
  uint32_t property; // 1100 is the end of list
  tk_param params[4];
};

// Size: 0x0C
struct tk_voiceclip
{
  int folder; // folder of voice
  int val2;
  int clip; // ID of the clip
};

// Size: 0x10
struct tk_encrypted
{
  uint64_t value;
  uint64_t key;
};

// Size: 0x30
struct tk_move_hitbox
{
  uint32_t startup;
  uint32_t recovery;
  uint32_t location;
  float related_floats[9];
};

// Size: 0x44
struct tk_move_unknown
{
  int _0x0[3];    // offset 0x0
  float _0xC[3];  // offset 0xC
  uint32_t _0x14; // offset 0x14
  float _0x18[3]; // offset 0x18
  uint32_t _0x24; // offset 0x24
}; // offset 0x2E4

// Size: 0x448
struct tk_move
{
  tk_encrypted name_key;        // offset 0x0
  uint32_t name_key_related[4]; // offset 0x10

  tk_encrypted anim_name_key;        // offset 0x20
  uint32_t anim_name_key_related[4]; // offset 0x30

  char *name_addr;      // offset 0x40 - no longer used, points to "?"
  char *anim_name_addr; // offset 0x48 - no longer used, points to "?"
  uint32_t anim_key;    // offset 0x50
  uint32_t skeleton_id; // offset 0x54

  tk_encrypted vuln;        // offset 0x58
  uint32_t vuln_related[4]; // offset 0x68

  tk_encrypted hit_level;        // offset 0x78
  uint32_t hit_level_related[4]; // offset 0x88

  tk_cancel *cancel_addr;   // offset 0x98
  tk_cancel *cancel1_addr;  // offset 0xA0
  int32_t cancel1_related;  // offset 0xA8
  tk_cancel *cancel2_addr;  // offset 0xB0
  int32_t cancel2_related;  // offset 0xB8
  tk_cancel *cancel_addr3;  // offset 0xC0
  uint32_t cancel3_related; // offset 0xC8
  uint16_t transition;      // offset 0xCC
  uint16_t _0xCE;           // offset 0xCE - some move end rotation value I think

  tk_encrypted ordinal_id1;        // offset 0xD0
  uint32_t ordinal_id1_related[4]; // offset 0xE0

  tk_encrypted ordinal_id2;        // offset 0xF0
  uint32_t ordinal_id2_related[4]; // offset 0x100

  tk_hit_condition *hit_condition_ptr;           // offset 0x110
  uint32_t damage_override;                      // offset 0x118
  uint32_t anim_max_len_adjuster;                // offset 0x11C
  uint32_t anim_max_length;                      // offset 0x120
  uint32_t airborne_start;                       // offset 0x124
  uint32_t airborne_end;                         // offset 0x128
  uint32_t ground_fall;                          // offset 0x12C
  tk_voiceclip *voiceclip_ptr;                   // offset 0x130
  tk_extraprops *extra_properties_ptr;           // offset 0x138
  tk_frameless_props *move_start_properties_ptr; // offset 0x140
  tk_frameless_props *move_end_properties_ptr;   // offset 0x148
  uint32_t u15;                                  // offset 0x150
  uint32_t _0x154;                               // offset 0x154
  uint32_t startup;                              // offset 0x158
  uint32_t recovery;                             // offset 0x15C

  tk_move_hitbox hitboxes[8]; // offset 0x160 - 0x2E0
  uint32_t _0x2E0;            // offset 0x2E0
  tk_move_unknown _0x2E4[8];  // offset 0x2E4 - 0x440
};

// Size: 0xE0
struct tk_projectile
{
  uint32_t u1[35];                     // Offset: 0x0
  tk_hit_condition *hit_condition_idx; // Offset: 0x90
  tk_cancel *cancel_idx;               // Offset: 0x98
  uint32_t u2[16];                     // Offset: 0xa0
};

// Size: 0x08
struct tk_input
{
  union
  {
    uint64_t command;
    struct
    {
      uint32_t direction;
      uint32_t button;
    };
  };
};

// Size: 0x10
struct tk_input_sequence
{
  uint16_t input_window_frames;
  uint16_t input_amount;
  tk_input *inputs;
};

// Size: 0x04
struct tk_parryable_move
{
  uint32_t value;
};

// Size: 0x0C
struct tk_throw_extra
{
  uint32_t pick_probability;
  uint16_t camera_type;
  uint16_t left_side_camera_data;
  uint16_t right_side_camera_data;
  uint16_t additional_rotation;
};

// Size: 0x10
struct tk_throw
{
  uint64_t side; // Side at which throw recovers
  tk_throw_extra *throwextra;
};

// Size: 0x18
struct tk_dialogue
{
  uint16_t type;
  uint16_t id;
  tk_requirement *requirements;
  uint32_t voiceclip_key;
  uint32_t facial_anim_idx;
};

// Size: 0x318
struct tk_moveset
{
  uint16_t skip_anim_lookup;
  bool is_written;
  uint32_t compile_date;        // E.g, "20240719"
  char signature[4];            // 0x8 - "TEK\0"
  char *character_name_addr;    // no longer used. Points to "?"
  char *character_creator_addr; // no longer used. Points to "?"
  char *date_addr;              // no longer used. Points to "?"
  char *fulldate_addr;          // no longer used. Points to "?"
  uint16_t original_aliases[60];
  uint16_t current_aliases[60];
  uint16_t unknown_aliases[32];
  uint32_t tranformed_char_id;                   // Use Expression "(X - 1) / 0xFFFF" to get the
                                                 // character ID.
  uint32_t tranformed_char_id2;                  // Use Expression "((X - 1) & 0xFFFF) + 1" to
                                                 // get the character ID.
  tk_reaction *reactions_ptr;                    // Offset: 0x168
  uint64_t string_block_end_offset;              // Offset: 0x170
  int reactions_count;                           // Offset: 0x178
  tk_requirement *requirements_ptr;              // Offset: 0x180
  int requirements_count;                        // Offset: 0x188
  tk_hit_condition *hit_conditions_ptr;          // Offset: 0x190
  int hit_conditions_count;                      // Offset: 0x198
  tk_projectile *projectiles_ptr;                // Offset: 0x1a0
  int projectiles_count;                         // Offset: 0x1a8
  tk_pushback *pushbacks_ptr;                    // Offset: 0x1b0
  int pushbacks_count;                           // Offset: 0x1b8
  tk_pushback_extradata *pushback_extradata_ptr; // Offset: 0x1c0
  int pushback_extradata_count;                  // Offset: 0x1c8
  tk_cancel *cancels_ptr;                        // Offset: 0x1d0
  int cancels_count;                             // Offset: 0x1d8
  tk_cancel *group_cancels_ptr;                  // Offset: 0x1e0
  int group_cancels_count;                       // Offset: 0x1e8
  tk_cancel_extradata *cancel_extradata_ptr;     // Offset: 0x1f0
  int cancel_extradata_count;                    // Offset: 0x1f8
  tk_extraprops *extra_move_properties_ptr;      // Offset: 0x200
  int extra_move_properties_count;               // Offset: 0x208
  tk_frameless_props *move_start_props_ptr;      // Offset: 0x210
  int move_start_props_count;                    // Offset: 0x218
  tk_frameless_props *move_end_props_ptr;        // Offset: 0x220
  int move_end_props_count;                      // Offset: 0x228
  tk_move *moves_ptr;                            // Offset: 0x230
  int moves_count;                               // Offset: 0x238
  tk_voiceclip *voiceclips_ptr;                  // Offset: 0x240
  int voiceclips_count;                          // Offset: 0x248
  tk_input_sequence *input_sequences_ptr;        // Offset: 0x250
  int input_sequences_count;                     // Offset: 0x258
  tk_input *inputs_ptr;                          // Offset: 0x260
  int inputs_count;                              // Offset: 0x268
  tk_parryable_move *parryable_list_ptr;         // Offset: 0x270
  int parryable_list_count;                      // Offset: 0x278
  tk_throw_extra *throw_extras_ptr;              // Offset: 0x280
  int throw_extras_count;                        // Offset: 0x288
  tk_throw *throws_ptr;                          // Offset: 0x290
  int throws_count;                              // Offset: 0x298
  tk_dialogue *dialogues_ptr;                    // Offset: 0x2a0
  int dialogues_count;                           // Offset: 0x2a8
  void *mota0;                                   // Offset: 0x2b0 - Body Mota. No longer used, always 0
  void *mota1;                                   // Offset: 0x2b8 - Body Mota. No longer used, always 0
  void *mota2;                                   // Offset: 0x2c0 - Hand Mota. No longer used, always 0
  void *mota3;                                   // Offset: 0x2c8 - Hand Mota. No longer used, always 0
  void *mota4;                                   // Offset: 0x2d0 - Face Mota. No longer used, always 0
  void *mota5;                                   // Offset: 0x2d8 - Face Mota. No longer used, always 0
  void *mota6;                                   // Offset: 0x2e0 - Swing Mota. No longer used, always 0
  void *mota7;                                   // Offset: 0x2e8 - Swing Mota. No longer used, always 0
  void *mota8;                                   // Offset: 0x2f0 - Camera Mota. No longer used, always 0
  void *mota9;                                   // Offset: 0x2f8 - Camera Mota. No longer used, always 0
  void *mota10;                                  // Offset: 0x300 - ExtraBody Mota. No longer used, always 0
  void *mota11;                                  // Offset: 0x308 - ExtraBody Mota. No longer used, always 0
  void *arc_mota_ptr;                            // Offset: 0x310 - Pointer to "xxxrotsm.arc" file. No longer
                                                 // used, always 0
};

struct __declspec(align(4)) tk_anim_related_struct
{
  uint64_t *function_pointers; // 0x0
  uint64_t *player_ptr;        // 0x08
  uint32_t _0x10;
  float _0x14;
  bool _0x18;
  bool _0x19;
  bool _0x1A;
  bool _0x1B;
  bool _0x1C;
  bool _0x1D;
  bool _0x1E;
  bool _0x1F;
  bool _0x20;
  bool _0x21;
  bool _0x22;
  bool _0x23;
  uint32_t chara_id;  // 0x24
  uint32_t mota_type; // 0x28
};

// 128 bytes (0x80)
struct TK__FOOTER
{
  char *signature;               // "__TEKKEN8FILES__";
  uint64_t someFlag;             // usually 1
  uint8_t decompress;            // 0x00 = no, 0x01 = yes. usually 1
  uint8_t aesKeyIndex;           // Used to generate an AES256 key from the keypool, usually 1
  uint8_t decryptionChecksum;    // Used to verify if Decrytion is value
  uint8_t decompressionChecksum; // Used to verify if Decompression is valid
  uint32_t _0x14;
  uint64_t tocOffset;           // 0x18 - Offset to the Encrypted TOC Block
  uint64_t compressedTocSize;   // 0x20 - Size of the compressed TOC Block
  uint64_t uncompressedTocSize; // 0x28 - Size of the uncompressed TOC Block
  uint64_t dataOffset;          // Value 0f 0x10. Alignment/padding?
  uint64_t dataSize;            // 0x38 - Another offset, Value is always tocOffset-0x10.
  uint32_t _0x40[16];
};

// TK7 mothead vbn files
struct TK__ArmatureBone
{
  char name[0x40];
  uint32_t _0x40;
  int parentBoneId; // 0x44
  uint32_t _0x48;   // looks like some hex value
}; // size 0x4C

struct Vector
{
  float x, y, z;
};

struct TK__ArmatureBoneFloats
{
  // Read them as either 9 floats or 3 vectors
  union
  {
    float floats[9];

    struct
    {
      Vector vector1;
      Vector vector2;
      Vector vector3;
    };
  };
};

struct TK__Vbn
{
  char sig[4];   // " VBN". Yes, 1st byte is space
  uint16_t _0x4; // Always 2
  uint16_t _0x6; // Always 1
  uint32_t numBones;
  uint32_t _0x0C;                   // Always 138, 151 only for "nsa"
  uint32_t _0x10;                   // Mostly 5
  uint32_t _0x14;                   // Always 34
  uint32_t _0x18;                   // Mostly 0
  TK__ArmatureBone bones[1];        // 0x1C - obviously, "numBones" elements
  TK__ArmatureBoneFloats floats[1]; // "numBones" elements
};

// Example class is of 0x17 bones
struct TK__MotBinAnimC8_Frame
{
  Vector bones[];
};

// T7 Frame-by-Frame (FBF) animation
// struct TK__MotBinAnimC8
// {
//   // Anim Header
//   uint16_t sig;       // 0x00. 0xC8 or 0x64
//   uint16_t numBones;  // 0x02. Generally 17.
//   uint32_t numFrames; // 0x04
//   // Descriptions
//   uint32_t descriptions[1]; // 0x08 - 0x08 + numBones * 4 - 4. numBones descriptors
//   // Animation Data
//   TK__MotBinAnimC8_Frame frames[];
// };