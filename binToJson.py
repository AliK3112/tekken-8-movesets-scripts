"""Convert Tekken 8 .motbin files to moveset JSON."""

import argparse
import json
import struct
import sys
import zlib
from datetime import datetime, timezone
from pathlib import Path

# ========================== Constants ==================================

XOR_KEYS = [
    0x964F5B9E,
    0xD88448A2,
    0xA84B71E0,
    0xA27D5221,
    0x9B81329F,
    0xADFB76C8,
    0x7DEF1F1C,
    0x7EE2BC2C,
]

N_ALIASES = 60
N_UNK_ALIASES = 36
BASE = 0x318
REQ_EOL = 1100
ENC_KEY = 0xEDCCFB96DCA40FBA

CHARACTER_NAMES = {
    0: "[PAUL]",
    1: "[LAW]",
    2: "[KING]",
    3: "[YOSHIMITSU]",
    4: "[HWOARANG]",
    5: "[XIAYOU]",
    6: "[JIN]",
    7: "[BRYAN]",
    8: "[KAZUYA]",
    9: "[STEVE]",
    10: "[JACK8]",
    11: "[ASUKA]",
    12: "[DEVIL_JIN]",
    13: "[FENG]",
    14: "[LILI]",
    15: "[DRAGUNOV]",
    16: "[LEO]",
    17: "[LARS]",
    18: "[ALISA]",
    19: "[CLAUDIO]",
    20: "[SHAHEEN]",
    21: "[NINA]",
    22: "[LEE]",
    23: "[KUMA]",
    24: "[PANDA]",
    25: "[ZAFINA]",
    26: "[LEROY]",
    27: "[JUN]",
    28: "[REINA]",
    29: "[AZUCENA]",
    30: "[VICTOR]",
    31: "[RAVEN]",
    32: "[AZAZEL]",
    33: "[EDDY]",
    34: "[LIDIA]",
    35: "[HEIHACHI]",
    36: "[CLIVE]",
    37: "[ANNA]",
    38: "[FAHKUMRAM]",
    39: "[ARMOR_KING]",
    40: "[MIARY_ZO]",
    41: "[KUNIMITSU]",
    42: "[BOB]",
    43: "[ROGER]",
    44: "[YUJIRO]",
    116: "[DUMMY]",
    117: "[ANGEL_JIN]",
    118: "[TRUE_DEVIL_KAZUYA]",
    119: "[JACK7]",
    120: "[SOLDIER]",
    121: "[DEVIL_JIN_2]",
    122: "[TEKKEN_MONK]",
    123: "[SEIRYU]",
    128: "[DUMMY]",
}

_SCRIPT_DIR = Path(__file__).resolve().parent


def _load_name_keys():
    path = _SCRIPT_DIR / "name_keys.json"
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as handle:
        raw = json.load(handle)
    return {int(k): v for k, v in raw.items()}


NAME_KEYS = _load_name_keys()


# ========================== Binary Reader ==================================


class BinaryReader:
    """Minimal little-endian binary reader for motbin/anmbin files."""

    def __init__(self, data: bytes):
        self._data = data
        self._pos = 0

    @classmethod
    def open(cls, path):
        with Path(path).open("rb") as handle:
            return cls(handle.read())

    def seek(self, offset):
        self._pos = offset

    def skip(self, count):
        self._pos += count

    def _unpack(self, offset, fmt):
        return struct.unpack_from("<" + fmt, self._data, offset)

    def read_uint16(self, offset=None):
        if offset is None:
            offset = self._pos
            self._pos += 2
        return self._unpack(offset, "H")[0]

    def read_int32(self, offset=None):
        if offset is None:
            offset = self._pos
            self._pos += 4
        return self._unpack(offset, "i")[0]

    def read_uint32(self, offset=None):
        if offset is None:
            offset = self._pos
            self._pos += 4
        return self._unpack(offset, "I")[0]

    def read_int64(self, offset):
        return self._unpack(offset, "q")[0]

    def read_uint64(self, offset=None):
        if offset is None:
            offset = self._pos
            self._pos += 8
        return self._unpack(offset, "Q")[0]

    def read_float32(self, offset):
        return self._unpack(offset, "f")[0]

    def read_array_of_bytes(self, size, pos):
        return bytearray(self._data[pos : pos + size])

    def read(self, struct_fn, pos=None, *args):
        read_pos = self._pos if pos is None else pos
        result = struct_fn(self, read_pos, *args) if args else struct_fn(self, read_pos)
        if pos is None:
            self._pos += result["size"]
        return result["value"]




# ========================== Helpers ==================================


def get_character_name(char_id):
    return CHARACTER_NAMES.get(char_id, "__UNKNOWN__")


getCharacterName = get_character_name


def _read_long(ctx, offset):
    return ctx.read_uint64(offset)


def _decrypt_bytes(move_bytes, attribute_offset):
    decrypted = []
    for i in range(8):
        value = struct.unpack_from("<I", move_bytes, attribute_offset + i * 4)[0]
        decrypted.append((value ^ XOR_KEYS[i]) & 0xFFFFFFFF)
    return decrypted


def _get_decrypted_value(move_bytes, attribute_offset, move_idx):
    return _decrypt_bytes(move_bytes, attribute_offset)[move_idx % 8]


def _make_val(n):
    return int(f"0xEF00{n:02x}00", 16)


# ========================== Structs ==========================


def tk_char_id(ctx, _pos):
    return {
        "value": (ctx.read_int32(0x160) - 1) // 0xFFFF,
        "size": 4,
    }


def tk_reaction(ctx, pos):
    reaction_keys = [
        "front_direction",
        "back_direction",
        "left_side_direction",
        "right_side_direction",
        "front_counterhit_direction",
        "downed_direction",
        "front_rotation",
        "back_rotation",
        "left_side_rotation",
        "right_side_rotation",
        "vertical_pushback",
        "downed_rotation",
        "standing",
        "ch",
        "crouch",
        "crouch_ch",
        "left_side",
        "left_side_crouch",
        "right_side",
        "right_side_crouch",
        "back",
        "back_crouch",
        "block",
        "crouch_block",
        "wallslump",
        "downed",
    ]
    off = pos
    reaction = {}

    reaction["pushback_indexes"] = []
    for _ in range(7):
        reaction["pushback_indexes"].append(ctx.read_uint64(off))
        off += 8

    for key in reaction_keys:
        reaction[key] = ctx.read_uint16(off)
        off += 2

    ctx.read_uint16(off)
    off += 2
    ctx.read_uint16(off)
    off += 2

    return {"value": reaction, "size": 0x70}


def tk_requirment(ctx, pos):
    return {
        "value": {
            "req": ctx.read_uint32(pos),
            "param": ctx.read_uint32(pos + 4),
            "param2": ctx.read_uint32(pos + 8),
            "param3": ctx.read_uint32(pos + 12),
            "param4": ctx.read_uint32(pos + 16),
        },
        "size": 20,
    }


def tk_hit_condition(ctx, pos):
    return {
        "value": {
            "requirement_idx": _read_long(ctx, pos),
            "damage": _read_long(ctx, pos + 8),
            "reaction_list_idx": _read_long(ctx, pos + 16),
        },
        "size": 24,
    }


def tk_projectile(ctx, pos):
    return {
        "value": {
            "u1": [ctx.read_uint32(pos + i * 4) for i in range(35)],
            "hit_condition_idx": ctx.read_uint64(pos + 0x90),
            "cancel_idx": ctx.read_uint64(pos + 0x98),
            "u2": [ctx.read_uint32(pos + 0xA0 + i * 4) for i in range(16)],
        },
        "size": 0xE0,
    }


def tk_pushback(ctx, pos):
    return {
        "value": {
            "val1": ctx.read_uint16(pos),
            "val2": ctx.read_uint16(pos + 2),
            "val3": ctx.read_uint32(pos + 4),
            "pushbackextra_idx": ctx.read_uint64(pos + 8),
        },
        "size": 0x10,
    }


def tk_displacement(ctx, pos):
    return {"value": ctx.read_uint16(pos), "size": 2}


def tk_cancel(ctx, pos):
    return {
        "value": {
            "command": ctx.read_uint64(pos),
            "extradata_idx": _read_long(ctx, pos + 16),
            "requirement_idx": _read_long(ctx, pos + 8),
            "frame_window_start": ctx.read_int32(pos + 24),
            "frame_window_end": ctx.read_int32(pos + 28),
            "starting_frame": ctx.read_int32(pos + 32),
            "move_id": ctx.read_uint16(pos + 36),
            "cancel_option": ctx.read_uint16(pos + 38),
        },
        "size": 40,
    }


def tk_cancel_flags(ctx, pos):
    return {"value": ctx.read_uint32(pos), "size": 4}


def tk_timed_extraprops(ctx, pos):
    return {
        "value": {
            "id": ctx.read_uint32(pos + 0x10),
            "type": ctx.read_uint32(pos),
            "requirement_idx": ctx.read_uint64(pos + 0x08),
            "_0x4": ctx.read_uint32(pos + 0x04),
            "value": ctx.read_uint32(pos + 0x14),
            "value2": ctx.read_uint32(pos + 0x18),
            "value3": ctx.read_uint32(pos + 0x1C),
            "value4": ctx.read_uint32(pos + 0x20),
            "value5": ctx.read_uint32(pos + 0x24),
        },
        "size": 40,
    }


def tk_untimed_extraprops(ctx, pos):
    return {
        "value": {
            "id": ctx.read_uint32(pos + 0x8),
            "requirement_idx": ctx.read_uint64(pos),
            "value": ctx.read_uint32(pos + 0xC),
            "value2": ctx.read_uint32(pos + 0x10),
            "value3": ctx.read_uint32(pos + 0x14),
            "value4": ctx.read_uint32(pos + 0x18),
            "value5": ctx.read_uint32(pos + 0x1C),
        },
        "size": 32,
    }


def tk_encrypted(ctx, pos):
    return {
        "value": {
            "value": ctx.read_uint64(pos),
            "key": ctx.read_uint64(pos + 0x8),
        },
        "size": 0x10,
    }


def tk_move_hitbox(ctx, pos):
    return {
        "value": {
            "first_active_frame": ctx.read_uint32(pos + 0x0),
            "last_active_frame": ctx.read_uint32(pos + 0x4),
            "location": ctx.read_uint32(pos + 0x8),
            "related_floats": [
                ctx.read_uint32(pos + 0xC + i * 4) for i in range(9)
            ],
        },
        "size": 0x30,
    }


def tk_move(ctx, pos, move_idx):
    def read_long(offset):
        return ctx.read_int64(offset)

    move_bytes = ctx.read_array_of_bytes(0x448, pos)
    name_key = _get_decrypted_value(move_bytes, 0x0, move_idx)
    anim_name_key = _get_decrypted_value(move_bytes, 0x20, move_idx)
    hurtbox = _get_decrypted_value(move_bytes, 0x58, move_idx)
    hit_level = _get_decrypted_value(move_bytes, 0x78, move_idx)
    ordinal1 = _get_decrypted_value(move_bytes, 0xD0, move_idx)
    ordinal2 = _get_decrypted_value(move_bytes, 0xF0, move_idx)

    name = NAME_KEYS.get(name_key, f"move_{move_idx}")
    anim_name = NAME_KEYS.get(anim_name_key, f"anim_{move_idx}")

    hitboxes = [
        tk_move_hitbox(ctx, pos + 0x160 + i * 0x30)["value"] for i in range(8)
    ]

    hi = hitboxes[1]["location"] & 0xFFFF
    lo = hitboxes[0]["location"] & 0xFFFF
    hitbox_location = (hi << 16) | lo

    move = {
        "name": name,
        "anim_name": anim_name,
        "name_key": name_key,
        "encrypted_name_key_key": ENC_KEY,
        "anim_key": anim_name_key,
        "encrypted_anim_key_key": ENC_KEY,
        "name_idx": read_long(pos + 0x40),
        "anim_name_idx": read_long(pos + 0x48),
        "anim_addr_enc1": ctx.read_uint32(pos + 0x50),
        "anim_addr_enc2": ctx.read_uint32(pos + 0x54),
        "vuln": hurtbox,
        "encrypted_vuln_key": ENC_KEY,
        "hitlevel": hit_level,
        "encrypted_hitlevel_key": ENC_KEY,
        "cancel_idx": read_long(pos + 0x98),
        "cancel1_addr": read_long(pos + 0xA0),
        "u1": read_long(pos + 0xA8),
        "u2": read_long(pos + 0xB0),
        "u3": read_long(pos + 0xB8),
        "u4": read_long(pos + 0xC0),
        "u6": read_long(pos + 0xC8),
        "transition": ctx.read_uint16(pos + 0xCC),
        "_0xCE": ctx.read_uint16(pos + 0xCE),
        "_0xD0": ordinal1,
        "encrypted__0xD0_key": ENC_KEY,
        "ordinal_id": ordinal2,
        "encrypted_ordinal_id_key": ENC_KEY,
        "hit_condition_idx": read_long(pos + 0x110),
        "_0x118": ctx.read_uint32(pos + 0x118),
        "_0x11C": ctx.read_uint32(pos + 0x11C),
        "anim_max_len": ctx.read_uint32(pos + 0x120),
        "airborne_start": ctx.read_uint32(pos + 0x124),
        "airborne_end": ctx.read_uint32(pos + 0x128),
        "ground_fall": ctx.read_uint32(pos + 0x12C),
        "voiceclip_idx": read_long(pos + 0x130),
        "extra_properties_idx": read_long(pos + 0x138),
        "move_start_properties_idx": read_long(pos + 0x140),
        "move_end_properties_idx": read_long(pos + 0x148),
        "hitbox_location": hitbox_location,
        "u15": ctx.read_uint32(pos + 0x150),
        "_0x154": ctx.read_uint32(pos + 0x154),
        "first_active_frame": ctx.read_uint32(pos + 0x158),
        "last_active_frame": ctx.read_uint32(pos + 0x15C),
        "u16": ctx.read_uint16(pos + 0x2E0),
        "u17": ctx.read_uint16(pos + 0x2E2),
        "u18": ctx.read_uint32(pos + 0x444),
        "unk5": [
            ctx.read_uint32(pos + 0x2E4 + 4 * i) for i in range(88)
        ],
    }

    for i, hitbox in enumerate(hitboxes):
        for key, value in hitbox.items():
            move[f"hitbox{i + 1}_{key}"] = value

    return {"value": move, "size": 0x448}


def tk_voiceclip(ctx, pos):
    return {
        "value": {
            "val1": ctx.read_uint32(pos),
            "val2": ctx.read_uint32(pos + 4),
            "val3": ctx.read_uint32(pos + 8),
        },
        "size": 12,
    }


def tk_input_sequence(ctx, pos):
    return {
        "value": {
            "u1": ctx.read_uint16(pos),
            "u2": ctx.read_uint16(pos + 2),
            "u3": ctx.read_uint32(pos + 4),
            "extradata_idx": _read_long(ctx, pos + 8),
        },
        "size": 16,
    }


def tk_input(ctx, pos):
    return {
        "value": {
            "u1": ctx.read_uint32(pos),
            "u2": ctx.read_uint32(pos + 4),
        },
        "size": 8,
    }


def tk_parryable_move(ctx, pos):
    return {"value": ctx.read_uint32(pos), "size": 4}


def tk_throw_camera_data(ctx, pos):
    return {
        "value": {
            "u1": ctx.read_uint32(pos),
            "u2": [ctx.read_uint16(pos + 4 + i * 2) for i in range(4)],
        },
        "size": 12,
    }


def tk_throw_camera_header(ctx, pos):
    return {
        "value": {
            "u1": _read_long(ctx, pos),
            "throwextra_idx": _read_long(ctx, pos + 8),
        },
        "size": 16,
    }


def tk_drama_dialogue(ctx, pos):
    return {
        "value": {
            "type": ctx.read_uint16(pos),
            "id": ctx.read_uint16(pos + 2),
            "_0x4": ctx.read_uint32(pos + 4),
            "requirement_idx": _read_long(ctx, pos + 8),
            "voiceclip_key": ctx.read_uint32(pos + 16),
            "facial_anim_idx": ctx.read_uint32(pos + 20),
        },
        "size": 24,
    }


# ========================== Utils & Functions ==========================


def init_moveset():
    return {
        "original_hash": "",
        "last_calculated_hash": "",
        "export_version": "",
        "version": "",
        "character_id": 0,
        "extraction_date": "",
        "_0x4": 0,
        "character_name": "",
        "tekken_character_name": "",
        "creator_name": "",
        "date": "",
        "fulldate": "",
        "original_aliases": [],
        "current_aliases": [],
        "unknown_aliases": [],
        "requirements": [],
        "cancels": [],
        "group_cancels": [],
        "moves": [],
        "reaction_list": [],
        "hit_conditions": [],
        "pushbacks": [],
        "pushback_extras": [],
        "extra_move_properties": [],
        "move_start_props": [],
        "move_end_props": [],
        "voiceclips": [],
        "input_sequences": [],
        "input_extradata": [],
        "cancel_extradata": [],
        "projectiles": [],
        "throw_extras": [],
        "throws": [],
        "parry_related": [],
        "dialogues": [],
        "mota_type": 0,
    }


def calculate_hash(moveset_data):
    exclude_keys = {
        "original_hash",
        "last_calculated_hash",
        "export_version",
        "character_name",
        "extraction_date",
        "tekken_character_name",
        "creator_name",
        "date",
        "fulldate",
    }

    data = "".join(
        str(moveset_data[key]) for key in moveset_data if key not in exclude_keys
    )
    hash_value = zlib.crc32(data.encode("utf-8")) & 0xFFFFFFFF
    return format(hash_value, "x")


def _cancel_has_req407(cancel, moveset):
    idx = cancel["requirement_idx"]
    while idx < len(moveset["requirements"]):
        req = moveset["requirements"][idx]["req"]
        if req == REQ_EOL:
            break
        if req >= 0x407 and req != 1049 and (req & 0x8000) == 0:
            return True
        idx += 1
    return False


def _cancel_has_req424(cancel, moveset):
    idx = cancel["requirement_idx"]
    while idx < len(moveset["requirements"]):
        req = moveset["requirements"][idx]["req"]
        if req == REQ_EOL:
            break
        if req >= 0x424 and (req & 0x8000) == 0:
            return True
        idx += 1
    return False


def _cancel_has_req_and_param(cancel, moveset, target, target_param=None):
    idx = cancel["requirement_idx"]
    while idx < len(moveset["requirements"]):
        requirement = moveset["requirements"][idx]
        req = requirement["req"]
        if req == REQ_EOL:
            break
        if req == target and (target_param is None or requirement["param"] == target_param):
            return True
        idx += 1
    return False


def _cancel_has_story_reqs(cancel, moveset):
    story_reqs = {667, 668, 1023, 745, 801, 802}
    idx = cancel["requirement_idx"]
    while idx < len(moveset["requirements"]):
        req = moveset["requirements"][idx]["req"]
        if req == REQ_EOL:
            break
        if req in story_reqs:
            return True
        idx += 1
    return False


def _cancel_check1(cancel, moveset):
    reqs = [131, 132, 133, 134, 135]
    flag1 = bool(cancel["command"]) or any(
        _cancel_has_req_and_param(cancel, moveset, req_id) for req_id in reqs
    )
    flag2 = not _cancel_has_story_reqs(cancel, moveset)
    return flag1 and flag2


def _cancel_check2(cancel, moveset):
    value = moveset["cancel_extradata"][cancel["extradata_idx"]]
    value &= 0x3C00
    return value not in (0x2800, 0x2C00)


def _cancel_check3(cancel, moveset):
    value = moveset["cancel_extradata"][cancel["extradata_idx"]]
    return (value & 0x3F) == 0x16


def _cancel_check4(cancel):
    move_id = cancel["move_id"]
    return move_id >= 0x8000 and (
        move_id == 0x8027 or move_id <= 0x8020 or move_id >= 0x802B
    )


def read_motbin_file(reader, anim_keys=None):
    if anim_keys is None:
        anim_keys = []

    def read_long(offset):
        return reader.read_uint64(offset)

    def get_start_and_count(offset):
        start = read_long(offset) + BASE
        count_offset = 16 if offset == 0x168 else 8
        count = read_long(offset + count_offset)
        return start, count

    def read_struct_list(offset, key, struct_fn, is_move=False):
        start, count = get_start_and_count(offset)
        if start != 0 and count > 0:
            reader.seek(start)
        read_count = 0
        for i in range(count):
            if is_move:
                value = reader.read(tk_move, None, i)
            else:
                value = reader.read(struct_fn)
            moveset[key].append(value)
            read_count += 1
        print(f'Read {read_count}/{count} items of "{key}"')

    char_id = reader.read(tk_char_id)
    char_name = get_character_name(char_id)

    moveset = init_moveset()
    moveset["export_version"] = "1.0.1"
    moveset["version"] = "Tekken8"
    moveset["character_id"] = char_id
    moveset["extraction_date"] = datetime.now(timezone.utc).isoformat()
    moveset["_0x4"] = reader.read_uint32(0x4)
    moveset["character_name"] = "t8_" + char_name[1:-1]
    moveset["tekken_character_name"] = char_name
    moveset["creator_name"] = 0
    moveset["date"] = 0
    moveset["fulldate"] = 0

    print(char_id, char_name, moveset["character_name"])

    reader.seek(0x30)
    moveset["original_aliases"] = [reader.read_uint16() for _ in range(N_ALIASES)]
    moveset["current_aliases"] = [reader.read_uint16() for _ in range(N_ALIASES)]
    moveset["unknown_aliases"] = [reader.read_uint16() for _ in range(N_UNK_ALIASES)]

    read_struct_list(0x168, "reaction_list", tk_reaction)
    read_struct_list(0x180, "requirements", tk_requirment)
    read_struct_list(0x190, "hit_conditions", tk_hit_condition)
    read_struct_list(0x1A0, "projectiles", tk_projectile)
    read_struct_list(0x1B0, "pushbacks", tk_pushback)
    read_struct_list(0x1C0, "pushback_extras", tk_displacement)
    read_struct_list(0x1D0, "cancels", tk_cancel)
    read_struct_list(0x1E0, "group_cancels", tk_cancel)
    read_struct_list(0x1F0, "cancel_extradata", tk_cancel_flags)
    read_struct_list(0x200, "extra_move_properties", tk_timed_extraprops)
    read_struct_list(0x210, "move_start_props", tk_untimed_extraprops)
    read_struct_list(0x220, "move_end_props", tk_untimed_extraprops)
    read_struct_list(0x230, "moves", tk_move, is_move=True)
    read_struct_list(0x240, "voiceclips", tk_voiceclip)
    read_struct_list(0x250, "input_sequences", tk_input_sequence)
    read_struct_list(0x260, "input_extradata", tk_input)
    read_struct_list(0x270, "parry_related", tk_parryable_move)
    read_struct_list(0x280, "throw_extras", tk_throw_camera_data)
    read_struct_list(0x290, "throws", tk_throw_camera_header)
    read_struct_list(0x2A0, "dialogues", tk_drama_dialogue)

    moveset["original_hash"] = calculate_hash(moveset)
    moveset["last_calculated_hash"] = calculate_hash(moveset)

    def calculate_cancel_options(array):
        for cancel in array:
            option = cancel["cancel_option"]
            option |= int(not cancel["command"])
            option |= 2 if _cancel_has_req407(cancel, moveset) else 0
            option |= 4 if _cancel_has_req424(cancel, moveset) else 0
            option |= 8 if _cancel_has_req_and_param(cancel, moveset, 0x87FB) else 0
            option |= 0x200 if _cancel_has_req_and_param(cancel, moveset, 159, 1) else 0
            option |= 0x10 if _cancel_check1(cancel, moveset) else 0
            option |= 0x40 if _cancel_check2(cancel, moveset) else 0
            option |= 0x80 if _cancel_check3(cancel, moveset) else 0
            option |= 0x100 if _cancel_check4(cancel) else 0
            cancel["cancel_option"] = option

    calculate_cancel_options(moveset["cancels"])
    calculate_cancel_options(moveset["group_cancels"])

    for i, move in enumerate(moveset["moves"]):
        anim_pair = anim_keys[i] if i < len(anim_keys) else None
        move["anim_addr_enc1"] = anim_pair[0] if anim_pair else move["anim_addr_enc1"]
        move["anim_addr_enc2"] = _make_val(char_id)

        anim_len = anim_pair[1] if anim_pair else move["anim_max_len"]
        if anim_len:
            anim_len += 1
        move["anim_max_len"] = anim_len
        if move["_0x11C"] > 1:
            move["anim_max_len"] = anim_len + 1 - move["_0x11C"]

    return moveset


def read_anim_lengths(reader):
    try:
        read_long = reader.read_uint64
        anim_count = reader.read_uint32(4)
        anim_list = read_long(0x38)
        anims = {}
        for i in range(anim_count):
            offset = anim_list + i * 56
            anim_key = reader.read_uint32(offset)
            anim_offset = read_long(offset + 8)
            anims[anim_key] = (
                reader.read_uint32(anim_offset + 0x40) + 1 if anim_offset else 0
            )
        return anims
    except Exception:
        return {}


def read_anim_keys(reader):
    try:
        read_long = reader.read_uint64
        anim_keys_count = reader.read_uint32(0x1C)
        anim_keys_list_offset = read_long(0x68)
        keys = [
            reader.read_uint32(anim_keys_list_offset + i * 4)
            for i in range(anim_keys_count)
        ]
        print(f"Read {len(keys)} anim keys")
        return keys
    except Exception:
        return []


def read_animations(anmbin_path, char_code):
    anim_keys = []
    anim_lengths_obj = {}
    com_anim_lengths_obj = {}

    anmbin_path = Path(anmbin_path)

    try:
        reader = BinaryReader.open(anmbin_path)
        anim_keys = read_anim_keys(reader)
        anim_lengths_obj = read_anim_lengths(reader)
    except Exception as exc:
        print(f"Failed to read character anim file: {exc}", file=sys.stderr)

    try:
        com_file_path = Path(str(anmbin_path).replace(char_code, "com"))
        reader = BinaryReader.open(com_file_path)
        com_anim_lengths_obj = read_anim_lengths(reader)
    except Exception as exc:
        print(f"Failed to read common anim file: {exc}", file=sys.stderr)

    return [
        [key, anim_lengths_obj.get(key, com_anim_lengths_obj.get(key, 0))]
        for key in anim_keys
    ]


def motbin_to_moveset(motbin_path, anmbin_path=None):
    """Read a .motbin file and return the moveset as a JSON-serializable dict."""
    motbin_path = Path(motbin_path)
    reader = BinaryReader.open(motbin_path)

    anim_keys = []
    if anmbin_path is not None:
        anim_keys = read_animations(anmbin_path, motbin_path.stem)

    return read_motbin_file(reader, anim_keys)


def write_moveset_json(moveset, output_path):
    output_path = Path(output_path)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(moveset, handle, indent=2)


def _parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="Convert a Tekken 8 .motbin file to moveset JSON.",
    )
    parser.add_argument(
        "motbin",
        help="Path to the .motbin file",
    )
    parser.add_argument(
        "anmbin",
        nargs="?",
        default=None,
        help="Optional path to the companion .anmbin file",
    )
    parser.add_argument(
        "output",
        nargs="?",
        default=None,
        help="Optional output path for the JSON file (defaults to <motbin>.json)",
    )
    return parser.parse_args(argv)


def main(argv=None):
    args = _parse_args(argv)
    motbin_path = Path(args.motbin)

    if not motbin_path.exists():
        print(f"Error: motbin file not found: {motbin_path}", file=sys.stderr)
        return 1

    anmbin_path = Path(args.anmbin) if args.anmbin else None
    if anmbin_path is not None and not anmbin_path.exists():
        print(f"Error: anmbin file not found: {anmbin_path}", file=sys.stderr)
        return 1

    output_path = (
        Path(args.output)
        if args.output
        else motbin_path.with_suffix(".json")
    )

    moveset = motbin_to_moveset(motbin_path, anmbin_path)
    write_moveset_json(moveset, output_path)
    print(
        f"Moveset {moveset['tekken_character_name']} written to {output_path}",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
