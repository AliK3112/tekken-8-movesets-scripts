typedef unsigned long long uint64_t;
typedef unsigned int uint32_t;
typedef int int32_t;
typedef unsigned short uint16_t;

typedef uint64_t tk_reaction;
typedef uint64_t tk_requirement;
typedef uint64_t tk_hit_condition;
typedef uint64_t tk_voiceclip;
typedef uint64_t tk_extraprops;
typedef uint64_t tk_move_start_end_props;

struct tk_cancel_extradata
{
  uint32_t value;
};

struct tk_cancel
{
  uint64_t command;
  tk_requirement* requirements;
  tk_cancel_extradata* extradata;
  uint32_t input_window_start;
  uint32_t input_window_end;
  uint32_t starting_frame;
  uint16_t move_id;
  uint16_t option;
};

struct tk_hit_condition
{
  tk_requirement* requirements;
  uint32_t damage;
  uint32_t _0xC;
  tk_reaction* reaction;
};

struct tk_encrypted
{
  uint64_t value;
  uint64_t key;
};

struct tk_move_hitbox
{
  uint32_t startup;
  uint32_t recovery;
  uint32_t location;
  float related_floats[9];
};

struct tk_move_unknown
{
  int _0x0[3];    // offset 0x0
  float _0xC[3];  // offset 0xC
  uint32_t _0x14; // offset 0x14
  float _0x18[3]; // offset 0x18
  uint32_t _0x24; // offset 0x24
}; // offset 0x2E4

struct MoveData
{
  tk_encrypted name_key;        // offset 0x0
  uint32_t name_key_related[4]; // offset 0x10

  tk_encrypted anim_name_key;        // offset 0x20
  uint32_t anim_name_key_related[4]; // offset 0x30

  uint32_t *name_addr;      // offset 0x40
  uint32_t *anim_name_addr; // offset 0x48
  uint32_t anim_key1;       // offset 0x50
  uint32_t anim_key2;       // offset 0x54

  tk_encrypted vuln;        // offset 0x58
  uint32_t vuln_related[4]; // offset 0x68

  tk_encrypted hit_level;        // offset 0x78
  uint32_t hit_level_related[4]; // offset 0x88

  tk_cancel *cancel_addr;   // offset 0x98
  tk_cancel *cancel1_addr;  // offset 0xA0
  int32_t cancel1_related;  // offset 0xA8
  int32_t cancel1_related2; // offset 0xAC
  tk_cancel *cancel2_addr;  // offset 0xB0
  int32_t cancel2_related;  // offset 0xB8
  int32_t cancel2_related2; // offset 0xBC
  tk_cancel *cancel_addr3;  // offset 0xC0
  uint32_t cancel3_related; // offset 0xC8
  uint16_t transition;      // offset 0xCC
  uint16_t _0xCE;           // offset 0xCE

  tk_encrypted _0xD0;        // offset 0xD0
  uint32_t _0xD0_related[4]; // offset 0xE0

  tk_encrypted ordinal_id;        // offset 0xF0
  uint32_t ordinal_id_related[4]; // offset 0x100

  tk_hit_condition *hit_condition_ptr;                // offset 0x110
  uint32_t _0x118;                                    // offset 0x118
  uint32_t _0x11C;                                    // offset 0x11C
  uint32_t anim_max_length;                           // offset 0x120
  uint32_t airborne_start;                            // offset 0x124
  uint32_t airborne_end;                              // offset 0x128
  uint32_t ground_fall;                               // offset 0x12C
  tk_voiceclip *voiceclip_ptr;                        // offset 0x130
  tk_extraprops *extra_properties_ptr;                // offset 0x138
  tk_move_start_end_props *move_start_properties_ptr; // offset 0x140
  tk_move_start_end_props *move_end_properties_ptr;   // offset 0x148
  uint32_t u15;                                       // offset 0x150
  uint32_t _0x154;                                    // offset 0x154
  uint32_t startup;                                   // offset 0x158
  uint32_t recovery;                                  // offset 0x15C

  tk_move_hitbox hitboxes[8]; // offset 0x160 - 0x2DC
  uint32_t _0x2E0; // offset 0x2E0
  tk_move_unknown _0x2E4[8];  // offset 0x2E4 - 0x440

  uint32_t _0x444; // offset 0x444
};
