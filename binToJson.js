// This file converts a motbin bin to a JSON
const crc32 = require("crc-32");
const fs = require("fs");
const hash = require("./kamui-hash/build/Release/kamuihash.node");
const BinaryFileReader = require("./binaryFileReader");
const { getCharacterName } = require("./utils");

const hex = (value, len = 8) => "0x" + value.toString(16).padStart(len, "0");
const print = console.log;
const readLong = (offset, ctx) => Number(ctx.readUInt64(offset));
const getByte = (value, byteNumber) => (value >>> (byteNumber * 8)) & 0xff;

// ========================== Constants ==================================

const XOR_KEYS = [
  0x964f5b9e, 0xd88448a2, 0xa84b71e0, 0xa27d5221, 0x9b81329f, 0xadfb76c8,
  0x7def1f1c, 0x7ee2bc2c,
];
const NAME_KEYS = (() => {
  try {
    return require("./name_keys.json");
  } catch {
    return {};
  }
})();
const N_ALIASES = 60;
const N_UNK_ALIASES = 36;
const BASE = 0x318;
const REQ_EOL = 1100;
const REACTION_KEYS = [
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
  "vertical_pushback", // front_counterhit_rotation
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
];
const FLAT_ARRAY_KEYS = [
  "cancel_extradata",
  "input_extradata",
  "pushback_extras",
  "parry_related",
];

const decryptBytes = (moveBytes, attributeOffset, moveIdx) => {
  let currentOffset = attributeOffset;
  for (let j = 0; j < XOR_KEYS.length; j++) {
    const key = XOR_KEYS[j];
    for (let k = 0; k < 4; k++) {
      moveBytes[currentOffset + k] ^= getByte(key, k);
    }
    currentOffset += 4;
  }
  return Buffer.from(moveBytes).readUInt32LE(
    attributeOffset + 4 * (moveIdx % 8),
  );
};

// ========================== Structs ==========================
const TK_CharId = (c) => ({
  value: (c.readInt32(0x160) - 1) / 0xffff,
  size: 4,
});

const TK_Reaction = (ctx, pos) => {
  let off = pos;
  const reaction = {};

  // 7 × uint64 pushbacks
  reaction.pushback_indexes = Array.from({ length: 7 }, () => {
    const v = Number(ctx.readUInt64(off));
    off += 8;
    return v;
  });

  // 2-byte fields
  for (const key of REACTION_KEYS) {
    reaction[key] = ctx.readUInt16(off);
    off += 2;
  }

  // skip trailing 4 bytes (_unk1 + _unk2)
  ctx.readUInt16(off);
  off += 2;
  ctx.readUInt16(off);
  off += 2;

  return { value: reaction, size: 0x70 };
};

const TK_Requirment = (ctx, pos) => ({
  value: {
    req: ctx.readUInt32(pos),
    param: ctx.readUInt32(pos + 4),
    param2: ctx.readUInt32(pos + 8),
    param3: ctx.readUInt32(pos + 12),
    param4: ctx.readUInt32(pos + 16),
  },
  size: 20,
});

const TK_HitCondition = (ctx, pos) => ({
  value: {
    requirement_idx: readLong(pos, ctx),
    damage: readLong(pos + 8, ctx),
    reaction_list_idx: readLong(pos + 16, ctx),
  },
  size: 24,
});

const TK_Projectile = (ctx, pos) => ({
  value: {
    // u1[35] → 35 × uint32 at 0x00
    u1: Array.from({ length: 35 }, (_, i) => ctx.readUInt32(pos + i * 4)),

    // TK__HitCondition* → pointer at 0x90
    hit_condition_idx: Number(ctx.readUInt64(pos + 0x90)),

    // TK__Cancel* → pointer at 0x98
    cancel_idx: Number(ctx.readUInt64(pos + 0x98)),

    // u2[16] → 16 × uint32 at 0xA0
    u2: Array.from({ length: 16 }, (_, i) =>
      ctx.readUInt32(pos + 0xa0 + i * 4),
    ),
  },
  size: 0xe0,
});

const TK_Pushback = (ctx, pos) => ({
  value: {
    val1: ctx.readUInt16(pos),
    val2: ctx.readUInt16(pos + 2),
    val3: ctx.readUInt32(pos + 4),
    pushbackextra_idx: Number(ctx.readUInt64(pos + 8)), // pointer
  },
  size: 0x10,
});

const TK_Displacement = (ctx, pos) => ({
  value: ctx.readUInt16(pos),
  size: 2,
});

const TK_Cancel = (ctx, pos) => {
  const command = ctx.readUInt64(pos);
  const requirementIdx = readLong(pos + 8, ctx);
  const extradataIdx = readLong(pos + 16, ctx);
  const start = ctx.readInt32(pos + 24);
  const end = ctx.readInt32(pos + 28);
  const frame = ctx.readInt32(pos + 32);
  const moveId = ctx.readUInt16(pos + 36);
  const option = ctx.readUInt16(pos + 38);

  return {
    value: {
      command,
      extradata_idx: extradataIdx,
      requirement_idx: requirementIdx,
      frame_window_start: start,
      frame_window_end: end,
      starting_frame: frame,
      move_id: moveId,
      cancel_option: option,
    },
    size: 40,
  };
};

const TK_CancelFlags = (ctx, pos) => ({
  value: ctx.readUInt32(pos),
  size: 4,
});

const TK_TimedExtraprops = (ctx, pos) => {
  const frame = ctx.readUInt32(pos);
  const _0x4 = ctx.readUInt32(pos + 0x04);
  const requirementIdx = Number(ctx.readUInt64(pos + 0x08)); // pointer
  const prop = ctx.readUInt32(pos + 0x10);
  const value1 = ctx.readUInt32(pos + 0x14);
  const value2 = ctx.readUInt32(pos + 0x18);
  const value3 = ctx.readUInt32(pos + 0x1c);
  const value4 = ctx.readUInt32(pos + 0x20);
  const value5 = ctx.readUInt32(pos + 0x24);
  return {
    value: {
      id: prop,
      type: frame,
      requirement_idx: requirementIdx,
      _0x4,
      value: value1,
      value2,
      value3,
      value4,
      value5,
    },
    size: 40,
  };
};

const TK_UntimedExtraprops = (ctx, pos) => {
  const requirementIdx = Number(ctx.readUInt64(pos)); // pointer
  const prop = ctx.readUInt32(pos + 0x8);
  return {
    value: {
      id: prop,
      requirement_idx: requirementIdx,
      value: ctx.readUInt32(pos + 0xc),
      value2: ctx.readUInt32(pos + 0x10),
      value3: ctx.readUInt32(pos + 0x14),
      value4: ctx.readUInt32(pos + 0x18),
      value5: ctx.readUInt32(pos + 0x1c),
    },
    size: 32,
  };
};

// TODO: Move
const TK_Encrypted = (c, pos) => ({
  value: {
    value: c.readUInt64(pos),
    key: c.readUInt64(pos + 0x8),
  },
  size: 0x10,
});

const TK_MoveHitbox = (c, pos) => ({
  value: {
    first_active_frame: c.readUInt32(pos + 0x0),
    last_active_frame: c.readUInt32(pos + 0x4),
    location: c.readUInt32(pos + 0x8),
    // related_floats: Array.from({ length: 9 }, (_, i) =>
    //   c.readFloat32(pos + 0xc + i * 4),
    // ),
    related_floats: Array.from({ length: 9 }, (_, i) =>
      c.readUInt32(pos + 0xc + i * 4),
    ),
  },
  size: 0x30, // 3*4 + 9*4
});

const TK_Move = (c, pos, moveIdx) => {
  const readLong = (offset) => Number(c.readInt64(offset));

  const bytes = c.readArrayOfBytes(0x448, pos);
  const nameKey = decryptBytes(bytes, 0x0, moveIdx);
  const animNameKey = decryptBytes(bytes, 0x20, moveIdx);
  const hurtbox = decryptBytes(bytes, 0x58, moveIdx);
  const hitLevel = decryptBytes(bytes, 0x78, moveIdx);
  const ordinal1 = decryptBytes(bytes, 0xd0, moveIdx);
  const ordinal2 = decryptBytes(bytes, 0xf0, moveIdx);

  const name = NAME_KEYS[nameKey] ?? "move_" + moveIdx;
  const animName = NAME_KEYS[animNameKey] ?? "anim_" + moveIdx;
  // print(i, hex(nameKey), name);
  const encKey = 0xedccfb96dca40fban;

  const hitboxes = Array.from(
    { length: 8 },
    (_, i) => TK_MoveHitbox(c, pos + 0x160 + i * 0x30).value,
  );

  // TODO: Get Max Anim Length from the anmbin file

  const hi = hitboxes[1].location & 0xffff;
  const lo = hitboxes[0].location & 0xffff;
  const hitboxLocation = (hi << 16) | lo;

  const move = {
    name,
    anim_name: animName,
    name_key: nameKey,
    encrypted_name_key_key: encKey,
    anim_key: animNameKey,
    encrypted_anim_key_key: encKey,
    name_idx: readLong(pos + 0x40, c),
    anim_name_idx: readLong(pos + 0x48, c),
    anim_addr_enc1: c.readUInt32(pos + 0x50),
    anim_addr_enc2: c.readUInt32(pos + 0x54),
    vuln: hurtbox,
    encrypted_vuln_key: encKey,
    hitlevel: hitLevel,
    encrypted_hitlevel_key: encKey,
    cancel_idx: readLong(pos + 0x98),
    cancel1_addr: readLong(pos + 0xa0),
    u1: readLong(pos + 0xa8),
    u2: readLong(pos + 0xb0),
    u3: readLong(pos + 0xb8),
    u4: readLong(pos + 0xc0),
    u6: readLong(pos + 0xc8),
    transition: c.readUInt16(pos + 0xcc),
    _0xCE: c.readUInt16(pos + 0xce),
    _0xD0: ordinal1,
    encrypted__0xD0_key: encKey,
    ordinal_id: ordinal2,
    encrypted_ordinal_id_key: encKey,
    hit_condition_idx: readLong(pos + 0x110),
    _0x118: c.readUInt32(pos + 0x118),
    _0x11C: c.readUInt32(pos + 0x11c),
    anim_max_len: c.readUInt32(pos + 0x120),
    airborne_start: c.readUInt32(pos + 0x124),
    airborne_end: c.readUInt32(pos + 0x128),
    ground_fall: c.readUInt32(pos + 0x12c),
    voiceclip_idx: readLong(pos + 0x130),
    extra_properties_idx: readLong(pos + 0x138),
    move_start_properties_idx: readLong(pos + 0x140),
    move_end_properties_idx: readLong(pos + 0x148),
    hitbox_location: hitboxLocation,
    u15: c.readUInt32(pos + 0x150),
    _0x154: c.readUInt32(pos + 0x154),
    first_active_frame: c.readUInt32(pos + 0x158),
    last_active_frame: c.readUInt32(pos + 0x15c),
    ...hitboxes.reduce((obj, hitbox, i) => {
      Object.entries(hitbox).forEach(([key, value]) => {
        obj[`hitbox${i + 1}_${key}`] = value;
      });
      return obj;
    }, {}),
    u16: c.readUInt16(pos + 0x2e0),
    u17: c.readUInt16(pos + 0x2e2),
    u18: c.readUInt32(pos + 0x444),
    unk5: Array(88)
      .fill(0)
      .map((_, i) => c.readUInt32(pos + 0x2e4 + 4 * i)),
  };

  return {
    value: move,
    size: 0x448,
  };
};

const TK_Voiceclip = (ctx, pos) => ({
  value: {
    val1: ctx.readUInt32(pos),
    val2: ctx.readUInt32(pos + 4),
    val3: ctx.readUInt32(pos + 8),
  },
  size: 12,
});

const TK_InputSequence = (ctx, pos) => ({
  value: {
    u1: ctx.readUInt16(pos),
    u2: ctx.readUInt16(pos + 2),
    u3: ctx.readUInt32(pos + 4),
    extradata_idx: readLong(pos + 8, ctx),
  },
  size: 16,
});

const TK_Input = (ctx, pos) => ({
  value: {
    u1: ctx.readUInt32(pos), // direction
    u2: ctx.readUInt32(pos + 4), // button
  },
  size: 8,
});

const TK_ParryableMove = (ctx, pos) => ({
  value: ctx.readUInt32(pos),
  size: 4,
});

const TK_ThrowCameraData = (ctx, pos) => ({
  value: {
    u1: ctx.readUInt32(pos),
    u2: Array.from({ length: 4 }, (_, i) => ctx.readUInt16(pos + 4 + i * 2)),
  },
  size: 12,
});

const TK_ThrowCameraHeader = (ctx, pos) => ({
  value: {
    u1: readLong(pos, ctx),
    throwextra_idx: readLong(pos + 8, ctx),
  },
  size: 16,
});

const TK_DramaDialogue = (ctx, pos) => ({
  value: {
    type: ctx.readUInt16(pos),
    id: ctx.readUInt16(pos + 2),
    _0x4: ctx.readUInt32(pos + 4),
    requirement_idx: readLong(pos + 8, ctx),
    voiceclip_key: ctx.readUInt32(pos + 16),
    facial_anim_idx: ctx.readUInt32(pos + 20),
  },
  size: 24,
});

// ========================== Utils & Functions ==========================
function initMoveset() {
  return {
    original_hash: "",
    last_calculated_hash: "",
    export_version: "",
    version: "",
    character_id: 0,
    extraction_date: "",
    _0x4: 0,
    character_name: "",
    tekken_character_name: "",
    creator_name: "",
    date: "",
    fulldate: "",
    original_aliases: [],
    current_aliases: [],
    unknown_aliases: [],
    requirements: [],
    cancels: [],
    group_cancels: [],
    moves: [],
    reaction_list: [],
    hit_conditions: [],
    pushbacks: [],
    pushback_extras: [],
    extra_move_properties: [],
    move_start_props: [],
    move_end_props: [],
    voiceclips: [],
    input_sequences: [],
    input_extradata: [],
    cancel_extradata: [],
    projectiles: [],
    throw_extras: [],
    throws: [],
    parry_related: [],
    dialogues: [],
    mota_type: 0,
  };
}

function calculateHash(movesetData) {
  const excludeKeys = [
    "original_hash",
    "last_calculated_hash",
    "export_version",
    "character_name",
    "extraction_date",
    "tekken_character_name",
    "creator_name",
    "date",
    "fulldate",
  ];

  let data = "";

  // Concatenate the values of keys not in excludeKeys
  for (const key of Object.keys(movesetData)) {
    if (!excludeKeys.includes(key)) {
      data += String(movesetData[key]);
    }
  }

  // Calculate CRC32 and convert to hexadecimal
  const hash = crc32.str(data);
  return (hash >>> 0).toString(16); // Ensure unsigned 32-bit result and convert to hex
}

function cancelHasReq407(cancel, moveset) {
  let idx = cancel.requirement_idx;
  while (idx < moveset.requirements.length) {
    const { req } = moveset.requirements[idx];
    if (req === REQ_EOL) break;
    if (req >= 0x407 && req !== 1049 && (req & 0x8000) === 0) return true;
    idx++;
  }
  return false;
}

function cancelHasReq424(cancel, moveset) {
  let idx = cancel.requirement_idx;
  while (idx < moveset.requirements.length) {
    const { req } = moveset.requirements[idx];
    if (req === REQ_EOL) break;
    if (req >= 0x424 && (req & 0x8000) === 0) return true;
    idx++;
  }
  return false;
}

function cancelHasReqAndParam(cancel, moveset, target, targetParam = null) {
  let idx = cancel.requirement_idx;
  while (idx < moveset.requirements.length) {
    const { req, param } = moveset.requirements[idx];
    if (req === REQ_EOL) break;
    if (req === target && (targetParam === null || param === targetParam)) {
      return true;
    }
    idx++;
  }
  return false;
}

function cancelHasStoryReqs(cancel, moveset) {
  const storyReqs = [667, 668, 1023, 745, 801, 802];
  let idx = cancel.requirement_idx;
  while (idx < moveset.requirements.length) {
    const { req } = moveset.requirements[idx];
    if (req === REQ_EOL) break;
    if (storyReqs.includes(req)) return true;
    idx++;
  }
  return false;
}

function cancelCheck1(cancel, moveset) {
  const reqs = [131, 132, 133, 134, 135];
  const flag1 =
    cancel.command ||
    reqs.some((id) => cancelHasReqAndParam(cancel, moveset, id));
  const flag2 = !cancelHasStoryReqs(cancel, moveset);
  return flag1 && flag2;
}

function cancelCheck2(cancel, moveset) {
  let value = moveset.cancel_extradata[cancel.extradata_idx];
  value = value & 0x3c00;
  return !(value == 0x2800 || value == 0x2c00);
}

function cancelCheck3(cancel, moveset) {
  const value = moveset.cancel_extradata[cancel.extradata_idx];
  return (value & 0x3f) === 0x16;
}

function cancelCheck4(cancel) {
  const moveId = cancel.move_id;
  return (
    moveId >= 0x8000 &&
    (moveId === 0x8027 || moveId <= 0x8020 || moveId >= 0x802b)
  );
}

/**
 * @param {BinaryFileReader} reader
 * @param {number[][]} animKeys
 */
function readMotbinFile(reader, animKeys = []) {
  // ======== HELPERS ========
  const readLong = (offset) => Number(reader.readUInt64(offset));

  const getStartAndCount = (offset) => {
    const start = readLong(offset) + BASE;
    const countOffset = offset === 0x168 ? 16 : 8;
    const count = readLong(offset + countOffset);
    return [start, count];
  };

  const readStructList = (offset, key, StructFn) => {
    if (!StructFn) throw Error("A Struct Function is Required");
    const [start, count] = getStartAndCount(offset);
    // print(hex(start), count);
    if (start !== 0) reader.seek(start);
    let readCount = 0;
    for (let i = 0; i < count; i++) {
      const value =
        key === "moves"
          ? reader.read((c, p) => StructFn(c, p, i))
          : reader.read(StructFn);
      moveset[key].push(value);
      readCount++;
    }
    print(`Read ${readCount}/${count} items of "${key}"`);
  };

  // =========================

  // Reading initial header
  const charId = reader.read(TK_CharId);
  const charName = getCharacterName(charId);

  const moveset = initMoveset();

  moveset.export_version = "1.0.1";
  moveset.version = "Tekken8";
  moveset.character_id = charId;
  moveset.extraction_date = new Date().toISOString();
  moveset._0x4 = reader.readUInt32(0x4);
  moveset.character_name = "t8_" + charName.slice(1, -1);
  moveset.tekken_character_name = charName;
  moveset.creator_name = 0;
  moveset.date = 0;
  moveset.fulldate = 0;

  print(charId, charName, moveset.character_name);

  reader.seek(0x30);
  for (let i = 0; i < N_ALIASES; i++) {
    moveset.original_aliases[i] = reader.readUInt16();
  }
  for (let i = 0; i < N_ALIASES; i++) {
    moveset.current_aliases[i] = reader.readUInt16();
  }
  for (let i = 0; i < N_UNK_ALIASES; i++) {
    moveset.unknown_aliases[i] = reader.readUInt16();
  }

  // Reading requirements
  readStructList(0x168, "reaction_list", TK_Reaction);
  readStructList(0x180, "requirements", TK_Requirment);
  readStructList(0x190, "hit_conditions", TK_HitCondition);
  readStructList(0x1a0, "projectiles", TK_Projectile);
  readStructList(0x1b0, "pushbacks", TK_Pushback);
  readStructList(0x1c0, "pushback_extras", TK_Displacement);
  readStructList(0x1d0, "cancels", TK_Cancel);
  readStructList(0x1e0, "group_cancels", TK_Cancel);
  readStructList(0x1f0, "cancel_extradata", TK_CancelFlags);
  readStructList(0x200, "extra_move_properties", TK_TimedExtraprops);
  readStructList(0x210, "move_start_props", TK_UntimedExtraprops);
  readStructList(0x220, "move_end_props", TK_UntimedExtraprops);
  readStructList(0x230, "moves", TK_Move);
  readStructList(0x240, "voiceclips", TK_Voiceclip);
  readStructList(0x250, "input_sequences", TK_InputSequence);
  readStructList(0x260, "input_extradata", TK_Input);
  readStructList(0x270, "parry_related", TK_ParryableMove);
  readStructList(0x280, "throw_extras", TK_ThrowCameraData);
  readStructList(0x290, "throws", TK_ThrowCameraHeader);
  readStructList(0x2a0, "dialogues", TK_DramaDialogue);

  // POST PROCESSING STUFF
  moveset.original_hash = calculateHash(moveset);
  moveset.last_calculated_hash = calculateHash(moveset);

  const calculateCancelOptions = (array) => {
    array.forEach((cancel) => {
      let option = cancel.cancel_option;
      option |= +!cancel.command;
      option |= cancelHasReq407(cancel, moveset) ? 2 : 0;
      option |= cancelHasReq424(cancel, moveset) ? 4 : 0;
      option |= cancelHasReqAndParam(cancel, moveset, 0x87fb) ? 8 : 0;
      option |= cancelHasReqAndParam(cancel, moveset, 159, 1) ? 0x200 : 0;
      option |= cancelCheck1(cancel, moveset) ? 0x10 : 0;
      option |= cancelCheck2(cancel, moveset) ? 0x40 : 0;
      option |= cancelCheck3(cancel, moveset) ? 0x80 : 0;
      option |= cancelCheck4(cancel) ? 0x100 : 0;
      cancel.cancel_option = option;
    });
  };

  calculateCancelOptions(moveset.cancels);
  calculateCancelOptions(moveset.group_cancels);

  const makeVal = (n) => parseInt(`0xEF00${n.toString(16).padStart(2, "0")}00`);

  // Animation Keys
  for (let i = 0; i < moveset.moves.length; i++) {
    const move = moveset.moves[i];
    move.anim_addr_enc1 = animKeys?.[i][0] ?? move.anim_addr_enc1;
    move.anim_addr_enc2 = makeVal(charId);

    let animLen = animKeys?.[i][1] ?? move.anim_max_len;
    animLen = animLen ? animLen + 1 : animLen;
    move.anim_max_len = animLen;
    // idk what's this but replicating game's behaviour
    if (move._0x11C > 1) {
      move.anim_max_len = animLen + 1 - move._0x11C;
    }
  }

  return moveset;
}

function readAnimLengths(reader) {
  try {
    // print("Reading anim lengths from %s", filePath);
    // const fileBuffer = fs.readFileSync(filePath);
    // const reader = new BinaryFileReader(fileBuffer.buffer);

    const readLong = (offset) => Number(reader.readUInt64(offset));

    const animCount = reader.readUInt32(4);
    // print("Count: %d", animCount);
    const animList = readLong(0x38);
    // print(hex(animList));

    const anims = {};
    for (let i = 0; i < animCount; i++) {
      const offset = animList + i * 56;
      const animKey = reader.readUInt32(offset);
      const animOffset = readLong(offset + 8);
      anims[animKey] = animOffset
        ? reader.readUInt32(animOffset + 0x40) + 1
        : 0;
    }
    return anims;
  } catch {
    return {};
  }
}

function readAnimKeys(reader) {
  try {
    // const fileBuffer = fs.readFileSync(filePath);
    // const reader = new BinaryFileReader(fileBuffer.buffer);

    const readLong = (offset) => Number(reader.readUInt64(offset));

    const animKeysCount = reader.readUInt32(0x1c);
    const animKeysListOffset = readLong(0x68);
    const keys = [];
    for (let i = 0; i < animKeysCount; i++) {
      const key = reader.readUInt32(animKeysListOffset + i * 4);
      keys.push(key);
    }
    print("Read %d anim keys", keys.length);
    return keys;
  } catch {
    return [];
  }
}

function readAnimations(filePath, charCode) {
  let animKeys = [];
  let animLengthsObj = {};
  let comAnimLengthsObj = {};

  // Try reading character-specific file
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const reader = new BinaryFileReader(fileBuffer.buffer);
    animKeys = readAnimKeys(reader);
    animLengthsObj = readAnimLengths(reader);
  } catch (e) {
    console.warn("Failed to read character anim file", e);
  }

  // Try reading common file
  try {
    const comFilePath = filePath.replace(charCode, "com");
    const fileBuffer = fs.readFileSync(comFilePath);
    const reader = new BinaryFileReader(fileBuffer.buffer);
    comAnimLengthsObj = readAnimLengths(reader);
  } catch (e) {
    console.warn("Failed to read common anim file", e);
  }

  // Merge whatever we managed to read
  return animKeys.map((key) => [
    key,
    animLengthsObj[key] ?? comAnimLengthsObj[key] ?? 0,
  ]);
}

function main() {
  const folderPath = "./Binary_expanded/mothead/bin";
  const files = fs
    .readdirSync(folderPath)
    .filter((file) => file.endsWith(".motbin") && !file.includes("ja4"));

  const codeName = process.argv[2];

  // Temporary
  if (!codeName) {
    print("Please provide a codename");
    return;
  }

  for (const file of files) {
    // If codename is present, also process that specific file, otherwise process everything
    if (codeName && !file.includes(codeName)) {
      continue;
    }

    const filePath = `${folderPath}/${file}`;

    const animFilePath = `${folderPath}/${file}`.replace(".motbin", ".anmbin");
    const animKeys = readAnimations(animFilePath, file.replace(".motbin", ""));

    const fileBuffer = fs.readFileSync(filePath);
    const reader = new BinaryFileReader(fileBuffer.buffer);

    const moveset = readMotbinFile(reader, animKeys);
    // const newFile = moveset.character_name + ".json";
    const newFile = "output/path.json";
    const data = JSON.stringify(
      moveset,
      (_, value) => (typeof value === "bigint" ? value.toString() : value),
      2,
    );
    fs.writeFileSync(newFile, data);
    console.log(
      `Moveset ${moveset.tekken_character_name} written at ${newFile}`,
    );
  }
}

main();
