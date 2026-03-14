/**
 * jsonToBin.js - Converts a moveset JSON file back to .motbin binary format.
 * Performs the inverse operation of binToJson.js.
 *
 * Usage: node jsonToBin.js <inputJsonPath> [outputPath] [mode]
 *
 * @see binToJson.js - Extraction logic reference
 * @see classes.h - TK__Moveset struct layout
 */

const fs = require("fs");

// ========================== Constants ==================================

const XOR_KEYS = [
  0x964f5b9e, 0xd88448a2, 0xa84b71e0, 0xa27d5221, 0x9b81329f, 0xadfb76c8,
  0x7def1f1c, 0x7ee2bc2c,
];

const N_ALIASES = 60;
const N_UNK_ALIASES = 36;
const BASE = 0x318;
const RAW_IDX_START = 0x765;

/**
 * 0 = No anim keys, no cancel options, no max anim length.
 * 
 * 1 = All the above is kept intact, "skip_anim_lookup_flag" is enabled.
 */
let EXTRACTION_MODE = 0;

// Struct sizes (bytes)
const SIZES = {
  TK_Reaction: 0x70,
  TK_Requirement: 20,
  TK_HitCondition: 24,
  TK_Projectile: 0xe0,
  TK_Pushback: 0x10,
  TK_Displacement: 2,
  TK_Cancel: 40,
  TK_CancelFlags: 4,
  TK_TimedExtraprops: 40,
  TK_UntimedExtraprops: 32,
  TK_Move: 0x448,
  TK_Voiceclip: 12,
  TK_InputSequence: 16,
  TK_Input: 8,
  TK_ParryableMove: 4,
  TK_ThrowCameraData: 12,
  TK_ThrowCameraHeader: 16,
  TK_DramaDialogue: 24,
};

// ========================== Buffer Writer Helpers ==================================

/**
 * Writes a 16-bit unsigned integer to the buffer at the given offset.
 * @param {Buffer} buf - The buffer to write to.
 * @param {number} offset - The offset to write at.
 * @param {number} value - The value to write.
 * @returns {number} The new offset.
 */
function writeUInt16LE(buf, offset, value) {
  buf.writeUInt16LE(value >>> 0, offset);
  return offset + 2;
}

/**
 * Writes a 32-bit unsigned integer to the buffer at the given offset.
 * @param {Buffer} buf - The buffer to write to.
 * @param {number} offset - The offset to write at.
 * @param {number} value - The value to write.
 * @returns {number} The new offset.
 */
function writeUInt32LE(buf, offset, value) {
  buf.writeUInt32LE(value >>> 0, offset);
  return offset + 4;
}

/**
 * Writes a 32-bit signed integer to the buffer at the given offset.
 * @param {Buffer} buf - The buffer to write to.
 * @param {number} offset - The offset to write at.
 * @param {number} value - The value to write.
 * @returns {number} The new offset.
 */
function writeInt32LE(buf, offset, value) {
  buf.writeInt32LE(value, offset);
  return offset + 4;
}

/**
 * Writes a 64-bit unsigned integer to the buffer at the given offset.
 * @param {Buffer} buf - The buffer to write to.
 * @param {number} offset - The offset to write at.
 * @param {number} value - The value to write.
 * @returns {number} The new offset.
 */
function writeUInt64LE(buf, offset, value) {
  const lo = BigInt(value) & 0xffffffffn;
  const hi = (BigInt(value) >> 32n) & 0xffffffffn;
  buf.writeUInt32LE(Number(lo), offset);
  buf.writeUInt32LE(Number(hi), offset + 4);
  return offset + 8;
}

function writeInt64LE(buf, offset, value) {
  writeUInt64LE(buf, offset, value < 0 ? BigInt(value) >>> 0n : BigInt(value));
}

/**
 * Encrypts a 32-bit value into a move's encrypted region.
 * XOR is symmetric - same operation as decrypt.
 * Block at blockIdx stores (value ^ key); other blocks store 0x765 + moveIdx.
 */
function encryptValue(moveBytes, attributeOffset, value, moveIdx) {
  const blockIdx = moveIdx % 8;
  for (let j = 0; j < XOR_KEYS.length; j++) {
    const key = XOR_KEYS[j];
    const offset = attributeOffset + j * 4;
    const toWrite = j === blockIdx ? value : (RAW_IDX_START + moveIdx);
    const encrypted = (toWrite ^ key) >>> 0;
    // const encrypted = toWrite;
    moveBytes.writeUInt32LE(encrypted, offset);
  }
}

// ========================== Struct Writers ==================================

function writeReaction(buf, offset, reaction) {
  let off = offset;
  // pushback_indexes: stored as raw values (indices/offsets) in the binary
  for (let i = 0; i < 7; i++) {
    const val = reaction.pushback_indexes?.[i] ?? 0;
    off = writeUInt64LE(buf, off, val);
  }
  off = writeUInt16LE(buf, off, reaction.front_direction ?? 0);
  off = writeUInt16LE(buf, off, reaction.back_direction ?? 0);
  off = writeUInt16LE(buf, off, reaction.left_side_direction ?? 0);
  off = writeUInt16LE(buf, off, reaction.right_side_direction ?? 0);
  off = writeUInt16LE(buf, off, reaction.front_counterhit_direction ?? 0);
  off = writeUInt16LE(buf, off, reaction.downed_direction ?? 0);
  off = writeUInt16LE(buf, off, reaction.front_rotation ?? 0);
  off = writeUInt16LE(buf, off, reaction.back_rotation ?? 0);
  off = writeUInt16LE(buf, off, reaction.left_side_rotation ?? 0);
  off = writeUInt16LE(buf, off, reaction.right_side_rotation ?? 0);
  off = writeUInt16LE(buf, off, reaction.vertical_pushback ?? 0);
  off = writeUInt16LE(buf, off, reaction.downed_rotation ?? 0);
  off = writeUInt16LE(buf, off, reaction.standing ?? 0);
  off = writeUInt16LE(buf, off, reaction.ch ?? 0);
  off = writeUInt16LE(buf, off, reaction.crouch ?? 0);
  off = writeUInt16LE(buf, off, reaction.crouch_ch ?? 0);
  off = writeUInt16LE(buf, off, reaction.left_side ?? 0);
  off = writeUInt16LE(buf, off, reaction.left_side_crouch ?? 0);
  off = writeUInt16LE(buf, off, reaction.right_side ?? 0);
  off = writeUInt16LE(buf, off, reaction.right_side_crouch ?? 0);
  off = writeUInt16LE(buf, off, reaction.back ?? 0);
  off = writeUInt16LE(buf, off, reaction.back_crouch ?? 0);
  off = writeUInt16LE(buf, off, reaction.block ?? 0);
  off = writeUInt16LE(buf, off, reaction.crouch_block ?? 0);
  off = writeUInt16LE(buf, off, reaction.wallslump ?? 0);
  off = writeUInt16LE(buf, off, reaction.downed ?? 0);
  off = writeUInt16LE(buf, off, 0);
  off = writeUInt16LE(buf, off, 0);
  return off;
}

function writeRequirement(buf, offset, req) {
  let off = offset;
  off = writeUInt32LE(buf, off, req.req ?? 0);
  off = writeUInt32LE(buf, off, req.param ?? 0);
  off = writeUInt32LE(buf, off, req.param2 ?? 0);
  off = writeUInt32LE(buf, off, req.param3 ?? 0);
  off = writeUInt32LE(buf, off, req.param4 ?? 0);
  return off;
}

function writeHitCondition(buf, offset, hc) {
  let off = offset;
  off = writeUInt64LE(buf, off, hc.requirement_idx ?? 0);
  off = writeUInt64LE(buf, off, hc.damage ?? 0);
  off = writeUInt64LE(buf, off, hc.reaction_list_idx ?? 0);
  return off;
}

function writeProjectile(buf, offset, proj) {
  let off = offset;
  for (let i = 0; i < 35; i++) {
    off = writeUInt32LE(buf, off, proj.u1?.[i] ?? 0);
  }
  off = writeUInt64LE(buf, off, proj.hit_condition_idx ?? 0);
  off = writeUInt64LE(buf, off, proj.cancel_idx ?? 0);
  for (let i = 0; i < 16; i++) {
    off = writeUInt32LE(buf, off, proj.u2?.[i] ?? 0);
  }
  return off;
}

function writePushback(buf, offset, pb) {
  let off = offset;
  off = writeUInt16LE(buf, off, pb.val1 ?? 0);
  off = writeUInt16LE(buf, off, pb.val2 ?? 0);
  off = writeUInt32LE(buf, off, pb.val3 ?? 0);
  off = writeUInt64LE(buf, off, pb.pushbackextra_idx ?? 0);
  return off;
}

function writeCancel(buf, offset, cancel) {
  let off = offset;
  off = writeUInt64LE(buf, off, BigInt(cancel.command ?? 0));
  off = writeUInt64LE(buf, off, cancel.requirement_idx ?? 0);
  off = writeUInt64LE(buf, off, cancel.extradata_idx ?? 0);
  off = writeInt32LE(buf, off, cancel.frame_window_start ?? 0);
  off = writeInt32LE(buf, off, cancel.frame_window_end ?? 0);
  off = writeInt32LE(buf, off, cancel.starting_frame ?? 0);
  off = writeUInt16LE(buf, off, cancel.move_id ?? 0);
  off = writeUInt16LE(buf, off, 0);
  return off;
}

function writeTimedExtraprops(buf, offset, prop) {
  let off = offset;
  off = writeUInt32LE(buf, off, prop.type ?? 0);
  off = writeUInt32LE(buf, off, prop._0x4 ?? 0);
  off = writeUInt64LE(buf, off, prop.requirement_idx ?? 0);
  off = writeUInt32LE(buf, off, prop.id ?? 0);
  off = writeUInt32LE(buf, off, prop.value ?? 0);
  off = writeUInt32LE(buf, off, prop.value2 ?? 0);
  off = writeUInt32LE(buf, off, prop.value3 ?? 0);
  off = writeUInt32LE(buf, off, prop.value4 ?? 0);
  off = writeUInt32LE(buf, off, prop.value5 ?? 0);
  return off;
}

function writeUntimedExtraprops(buf, offset, prop) {
  let off = offset;
  off = writeUInt64LE(buf, off, prop.requirement_idx ?? 0);
  off = writeUInt32LE(buf, off, prop.id ?? 0);
  off = writeUInt32LE(buf, off, prop.value ?? 0);
  off = writeUInt32LE(buf, off, prop.value2 ?? 0);
  off = writeUInt32LE(buf, off, prop.value3 ?? 0);
  off = writeUInt32LE(buf, off, prop.value4 ?? 0);
  off = writeUInt32LE(buf, off, prop.value5 ?? 0);
  return off;
}

/**
 * Writes a single TK__Move struct (0x448 bytes).
 *
 * @param {Buffer} buf - Output buffer.
 * @param {number} offset - Byte offset to write at.
 * @param {object} move - Move data from JSON.
 * @param {number} moveIdx - Index of the move (used for encryption).
 */
function writeMove(buf, offset, move, moveIdx) {
  const mode = EXTRACTION_MODE;
  const moveBytes = Buffer.alloc(SIZES.TK_Move, 0);

  // Encrypted fields
  encryptValue(moveBytes, 0x0, move.name_key ?? 0, moveIdx);
  encryptValue(moveBytes, 0x20, move.anim_key ?? 0, moveIdx);
  encryptValue(moveBytes, 0x58, move.vuln ?? 0, moveIdx);
  encryptValue(moveBytes, 0x78, move.hitlevel ?? 0, moveIdx);
  encryptValue(moveBytes, 0xd0, move._0xD0 ?? 0, moveIdx);
  encryptValue(moveBytes, 0xf0, move.ordinal_id ?? 0, moveIdx);

  // Pointers and scalars
  writeUInt64LE(moveBytes, 0x40, move.name_idx ?? 0);
  writeUInt64LE(moveBytes, 0x48, move.anim_name_idx ?? 0);
  writeUInt32LE(moveBytes, 0x50, mode ? (move.anim_addr_enc1 ?? 0) : moveIdx);
  writeUInt32LE(moveBytes, 0x54, mode ? (move.anim_addr_enc2 ?? 0) : 0);

  writeUInt64LE(moveBytes, 0x98, move.cancel_idx ?? 0);
  writeUInt64LE(moveBytes, 0xa0, move.cancel1_addr ?? 0);
  writeUInt64LE(moveBytes, 0xa8, move.u1 ?? 0);
  writeUInt64LE(moveBytes, 0xb0, move.u2 ?? 0);
  writeUInt64LE(moveBytes, 0xb8, move.u3 ?? 0);
  writeUInt64LE(moveBytes, 0xc0, move.u4 ?? 0);
  writeUInt64LE(moveBytes, 0xc8, move.u6 ?? 0);
  writeUInt16LE(moveBytes, 0xcc, move.transition ?? 0);
  writeUInt16LE(moveBytes, 0xce, move._0xCE ?? 0);

  const toU64 = (v) => (v == null || v < 0 ? 0xffffffffffffffffn : BigInt(v >>> 0));
  writeUInt64LE(moveBytes, 0x110, move.hit_condition_idx ?? 0);
  writeUInt32LE(moveBytes, 0x118, move._0x118 ?? 0);
  writeUInt32LE(moveBytes, 0x11c, move._0x11C ?? 0);
  writeUInt32LE(moveBytes, 0x120, mode ? (move.anim_max_len ?? 0) : 0);
  writeUInt32LE(moveBytes, 0x124, move.airborne_start ?? 0);
  writeUInt32LE(moveBytes, 0x128, move.airborne_end ?? 0);
  writeUInt32LE(moveBytes, 0x12c, move.ground_fall ?? 0);

  writeUInt64LE(moveBytes, 0x130, toU64(move.voiceclip_idx));
  writeUInt64LE(moveBytes, 0x138, toU64(move.extra_properties_idx));
  writeUInt64LE(moveBytes, 0x140, toU64(move.move_start_properties_idx));
  writeUInt64LE(moveBytes, 0x148, toU64(move.move_end_properties_idx));

  writeUInt32LE(moveBytes, 0x150, move.u15 ?? 0);
  writeUInt32LE(moveBytes, 0x154, move._0x154 ?? 0);
  writeUInt32LE(moveBytes, 0x158, move.first_active_frame ?? 0);
  writeUInt32LE(moveBytes, 0x15c, move.last_active_frame ?? 0);

  // Hitboxes
  for (let i = 0; i < 8; i++) {
    const hb = move[`hitbox${i + 1}`] ?? {};
    const hbOff = 0x160 + i * 0x30;
    writeUInt32LE(moveBytes, hbOff, hb.first_active_frame ?? move[`hitbox${i + 1}_first_active_frame`] ?? 0);
    writeUInt32LE(moveBytes, hbOff + 4, hb.last_active_frame ?? move[`hitbox${i + 1}_last_active_frame`] ?? 0);
    writeUInt32LE(moveBytes, hbOff + 8, hb.location ?? move[`hitbox${i + 1}_location`] ?? 0);
    const floats = hb.related_floats ?? move[`hitbox${i + 1}_related_floats`] ?? [];
    for (let j = 0; j < 9; j++) {
      writeUInt32LE(moveBytes, hbOff + 0xc + j * 4, floats[j] ?? 0);
    }
  }

  writeUInt16LE(moveBytes, 0x2e0, move.u16 ?? 0);
  writeUInt16LE(moveBytes, 0x2e2, move.u17 ?? 0);

  const unk5 = move.unk5 ?? [];
  for (let i = 0; i < 88; i++) {
    writeUInt32LE(moveBytes, 0x2e4 + i * 4, unk5[i] ?? 0);
  }

  writeUInt32LE(moveBytes, 0x444, move.u18 ?? 0);

  moveBytes.copy(buf, offset);
}

function writeVoiceclip(buf, offset, vc) {
  let off = offset;
  off = writeUInt32LE(buf, off, vc.val1 ?? 0);
  off = writeUInt32LE(buf, off, vc.val2 ?? 0);
  off = writeUInt32LE(buf, off, vc.val3 ?? 0);
  return off;
}

function writeInputSequence(buf, offset, seq) {
  let off = offset;
  off = writeUInt16LE(buf, off, seq.u1 ?? 0);
  off = writeUInt16LE(buf, off, seq.u2 ?? 0);
  off = writeUInt32LE(buf, off, seq.u3 ?? 0);
  off = writeUInt64LE(buf, off, seq.extradata_idx ?? 0);
  return off;
}

function writeInput(buf, offset, input) {
  let off = offset;
  off = writeUInt32LE(buf, off, input.u1 ?? 0);
  off = writeUInt32LE(buf, off, input.u2 ?? 0);
  return off;
}

function writeThrowCameraData(buf, offset, t) {
  let off = offset;
  off = writeUInt32LE(buf, off, t.u1 ?? 0);
  for (let i = 0; i < 4; i++) {
    off = writeUInt16LE(buf, off, t.u2?.[i] ?? 0);
  }
  return off;
}

function writeThrowCameraHeader(buf, offset, t) {
  let off = offset;
  off = writeUInt64LE(buf, off, t.u1 ?? 0);
  off = writeUInt64LE(buf, off, t.throwextra_idx ?? 0);
  return off;
}

function writeDramaDialogue(buf, offset, d) {
  let off = offset;
  off = writeUInt16LE(buf, off, d.type ?? 0);
  off = writeUInt16LE(buf, off, d.id ?? 0);
  off = writeUInt32LE(buf, off, d._0x4 ?? 0);
  off = writeUInt64LE(buf, off, d.requirement_idx ?? 0);
  off = writeUInt32LE(buf, off, d.voiceclip_key ?? 0);
  off = writeUInt32LE(buf, off, d.facial_anim_idx ?? 0);
  return off;
}

// ========================== Main Conversion ==================================

/**
 * Computes block offsets for all data sections.
 * @param {object} moveset - Parsed JSON moveset
 * @returns {{ offsets: number[], blockOffsets: object }}
 */
function computeBlockLayout(moveset) {
  const counts = {
    reaction_list: moveset.reaction_list?.length ?? 0,
    requirements: moveset.requirements?.length ?? 0,
    hit_conditions: moveset.hit_conditions?.length ?? 0,
    projectiles: moveset.projectiles?.length ?? 0,
    pushbacks: moveset.pushbacks?.length ?? 0,
    pushback_extras: moveset.pushback_extras?.length ?? 0,
    cancels: moveset.cancels?.length ?? 0,
    group_cancels: moveset.group_cancels?.length ?? 0,
    cancel_extradata: moveset.cancel_extradata?.length ?? 0,
    extra_move_properties: moveset.extra_move_properties?.length ?? 0,
    move_start_props: moveset.move_start_props?.length ?? 0,
    move_end_props: moveset.move_end_props?.length ?? 0,
    moves: moveset.moves?.length ?? 0,
    voiceclips: moveset.voiceclips?.length ?? 0,
    input_sequences: moveset.input_sequences?.length ?? 0,
    input_extradata: moveset.input_extradata?.length ?? 0,
    parry_related: moveset.parry_related?.length ?? 0,
    throw_extras: moveset.throw_extras?.length ?? 0,
    throws: moveset.throws?.length ?? 0,
    dialogues: moveset.dialogues?.length ?? 0,
  };

  const blockOrder = [
    "reaction_list", "requirements", "hit_conditions", "projectiles",
    "pushbacks", "pushback_extras", "cancels", "group_cancels",
    "cancel_extradata", "extra_move_properties", "move_start_props", "move_end_props",
    "moves", "voiceclips", "input_sequences", "input_extradata",
    "parry_related", "throw_extras", "throws", "dialogues",
  ];

  const sizeMap = {
    reaction_list: SIZES.TK_Reaction,
    requirements: SIZES.TK_Requirement,
    hit_conditions: SIZES.TK_HitCondition,
    projectiles: SIZES.TK_Projectile,
    pushbacks: SIZES.TK_Pushback,
    pushback_extras: SIZES.TK_Displacement,
    cancels: SIZES.TK_Cancel,
    group_cancels: SIZES.TK_Cancel,
    cancel_extradata: SIZES.TK_CancelFlags,
    extra_move_properties: SIZES.TK_TimedExtraprops,
    move_start_props: SIZES.TK_UntimedExtraprops,
    move_end_props: SIZES.TK_UntimedExtraprops,
    moves: SIZES.TK_Move,
    voiceclips: SIZES.TK_Voiceclip,
    input_sequences: SIZES.TK_InputSequence,
    input_extradata: SIZES.TK_Input,
    parry_related: SIZES.TK_ParryableMove,
    throw_extras: SIZES.TK_ThrowCameraData,
    throws: SIZES.TK_ThrowCameraHeader,
    dialogues: SIZES.TK_DramaDialogue,
  };

  let offset = BASE;
  const blockOffsets = {};
  for (const key of blockOrder) {
    blockOffsets[key] = offset;
    offset += counts[key] * sizeMap[key];
  }
  return { blockOffsets, counts };
}

/**
 * Writes the TK__Moveset header (0x0 - 0x318).
 *
 * @param {Buffer} buf - Output buffer to write the header into.
 * @param {object} moveset - Parsed JSON moveset (aliases, character_id, _0x4, etc.).
 * @param {Record<string, number>} blockOffsets - Map of block names to their start offsets in the buffer.
 * @param {Record<string, number>} counts - Map of block names to their element counts.
 */
function writeHeader(buf, moveset, blockOffsets, counts) {
  // 0x00: disable_anim_lookup (2 bytes) - EXTRACTION_MODE 1 sets to 1
  writeUInt16LE(buf, 0x00, EXTRACTION_MODE);
  // 0x02-0x07: is_written, _0x3, _0x4
  buf.fill(0, 0x02, 0x04);
  writeUInt32LE(buf, 0x04, moveset._0x4 ?? 0);

  // 0x08: "TEK\0"
  buf.write("TEK\0", 0x08, 4);

  writeUInt32LE(buf, 0x0C, 0);

  writeUInt64LE(buf, 0x10, 0); // character_name_addr
  writeUInt64LE(buf, 0x18, 0); // creator_addr
  writeUInt64LE(buf, 0x20, 0); // date_addr
  writeUInt64LE(buf, 0x28, 0); // fulldate_addr

  // 0x30: aliases
  const orig = moveset.original_aliases ?? [];
  const curr = moveset.current_aliases ?? [];
  const unk = moveset.unknown_aliases ?? [];
  for (let i = 0; i < N_ALIASES; i++) writeUInt16LE(buf, 0x30 + i * 2, orig[i] ?? 0);
  for (let i = 0; i < N_ALIASES; i++) writeUInt16LE(buf, 0x30 + 120 + i * 2, curr[i] ?? 0);
  for (let i = 0; i < N_UNK_ALIASES; i++) writeUInt16LE(buf, 0x30 + 240 + i * 2, unk[i] ?? 0);

  // 0x160: character_id (stored as (id * 0xffff + 1) for TK_CharId)
  // const charId = moveset.character_id ?? 0;
  // const charIdEnc = charId * 0xffff + 1;
  // writeInt32LE(buf, 0x160, charIdEnc);

  // 0x164-0x167: ordinal_id2 (per classes.h: (-charId)&0xffff | (charId<<16))
  // const ord2 = ((Number(-charId) >>> 0) & 0xffff) | ((charId & 0xffff) << 16);
  // writeUInt32LE(buf, 0x164, ord2);

  // 0x168-0x2a8: block pointers (offset - BASE) and counts
  const rlStart = blockOffsets.reaction_list ?? 0;
  writeUInt64LE(buf, 0x168, rlStart - BASE);
  writeUInt64LE(buf, 0x170, moveset._string_block_end_offset ?? 0);
  writeUInt64LE(buf, 0x178, counts.reaction_list ?? 0);

  const ptrPairs = [
    [0x180, "requirements", 0x188],
    [0x190, "hit_conditions", 0x198],
    [0x1a0, "projectiles", 0x1a8],
    [0x1b0, "pushbacks", 0x1b8],
    [0x1c0, "pushback_extras", 0x1c8],
    [0x1d0, "cancels", 0x1d8],
    [0x1e0, "group_cancels", 0x1e8],
    [0x1f0, "cancel_extradata", 0x1f8],
    [0x200, "extra_move_properties", 0x208],
    [0x210, "move_start_props", 0x218],
    [0x220, "move_end_props", 0x228],
    [0x230, "moves", 0x238],
    [0x240, "voiceclips", 0x248],
    [0x250, "input_sequences", 0x258],
    [0x260, "input_extradata", 0x268],
    [0x270, "parry_related", 0x278],
    [0x280, "throw_extras", 0x288],
    [0x290, "throws", 0x298],
    [0x2a0, "dialogues", 0x2a8],
  ];

  for (const [ptrOff, key, countOff] of ptrPairs) {
    const blockStart = blockOffsets[key] ?? 0;
    const relOffset = blockStart - BASE;
    writeUInt64LE(buf, ptrOff, relOffset);
    writeUInt64LE(buf, countOff, counts[key] ?? 0);
  }

  // 0x2b0-0x318: mota pointers (zeros)
  buf.fill(0, 0x2b0, BASE);
}

/**
 * Converts JSON moveset to binary .motbin buffer.
 * @param {object} moveset - Parsed JSON moveset
 * @returns {Buffer}
 */
function jsonToMotbin(moveset) {
  const { blockOffsets, counts } = computeBlockLayout(moveset);
  const totalSize = blockOffsets.dialogues + (counts.dialogues ?? 0) * SIZES.TK_DramaDialogue;
  const buf = Buffer.alloc(totalSize, 0);

  writeHeader(buf, moveset, blockOffsets, counts);

  let off = BASE;

  const blockConfig = [
    ["reaction_list", writeReaction, moveset.reaction_list],
    ["requirements", writeRequirement, moveset.requirements],
    ["hit_conditions", writeHitCondition, moveset.hit_conditions],
    ["projectiles", writeProjectile, moveset.projectiles],
    ["pushbacks", writePushback, moveset.pushbacks],
    ["pushback_extras", (b, o, d) => { writeUInt16LE(b, o, typeof d === "object" ? (d.value ?? 0) : (d ?? 0)); }, moveset.pushback_extras],
    ["cancels", writeCancel, moveset.cancels],
    ["group_cancels", writeCancel, moveset.group_cancels],
    ["cancel_extradata", (b, o, d) => writeUInt32LE(b, o, typeof d === "number" ? d : d?.value ?? 0), moveset.cancel_extradata],
    ["extra_move_properties", writeTimedExtraprops, moveset.extra_move_properties],
    ["move_start_props", writeUntimedExtraprops, moveset.move_start_props],
    ["move_end_props", writeUntimedExtraprops, moveset.move_end_props],
    ["moves", writeMove, moveset.moves],
    ["voiceclips", writeVoiceclip, moveset.voiceclips],
    ["input_sequences", writeInputSequence, moveset.input_sequences],
    ["input_extradata", writeInput, moveset.input_extradata],
    ["parry_related", (b, o, d) => writeUInt32LE(b, o, typeof d === "number" ? d : d?.value ?? 0), moveset.parry_related],
    ["throw_extras", writeThrowCameraData, moveset.throw_extras],
    ["throws", writeThrowCameraHeader, moveset.throws],
    ["dialogues", writeDramaDialogue, moveset.dialogues],
  ];

  const sizeMap = {
    reaction_list: SIZES.TK_Reaction,
    requirements: SIZES.TK_Requirement,
    hit_conditions: SIZES.TK_HitCondition,
    projectiles: SIZES.TK_Projectile,
    pushbacks: SIZES.TK_Pushback,
    pushback_extras: SIZES.TK_Displacement,
    cancels: SIZES.TK_Cancel,
    group_cancels: SIZES.TK_Cancel,
    cancel_extradata: SIZES.TK_CancelFlags,
    extra_move_properties: SIZES.TK_TimedExtraprops,
    move_start_props: SIZES.TK_UntimedExtraprops,
    move_end_props: SIZES.TK_UntimedExtraprops,
    moves: SIZES.TK_Move,
    voiceclips: SIZES.TK_Voiceclip,
    input_sequences: SIZES.TK_InputSequence,
    input_extradata: SIZES.TK_Input,
    parry_related: SIZES.TK_ParryableMove,
    throw_extras: SIZES.TK_ThrowCameraData,
    throws: SIZES.TK_ThrowCameraHeader,
    dialogues: SIZES.TK_DramaDialogue,
  };

  for (const [key, writer, arr] of blockConfig) {
    const arr2 = arr ?? [];
    const size = sizeMap[key];
    for (let i = 0; i < arr2.length; i++) {
      if (key === "moves") {
        writer(buf, off, arr2[i], i);
      } else if (key === "pushback_extras") {
        const val = typeof arr2[i] === "object" ? (arr2[i].value ?? arr2[i]) : arr2[i];
        writeUInt16LE(buf, off, val ?? 0);
      } else if (key === "cancel_extradata" || key === "parry_related") {
        const val = typeof arr2[i] === "object" ? arr2[i].value ?? arr2[i] : arr2[i];
        writeUInt32LE(buf, off, val ?? 0);
      } else {
        writer(buf, off, arr2[i]);
      }
      off += size;
    }
  }

  return buf;
}

// ========================== CLI ==================================

function main() {
  const args = process.argv.slice(2);
  const inputJsonPath = args[0];
  const outputPath = args[1] ?? inputJsonPath.replace(/\.json$/i, ".motbin");
  EXTRACTION_MODE = args[2] != 0 ? 1 : 0;

  if (!inputJsonPath) {
    console.error("Usage: node jsonToBin.js <inputJsonPath> [outputPath] [mode]");
    process.exit(1);
  }

  let moveset;
  try {
    const raw = fs.readFileSync(inputJsonPath, "utf8");
    moveset = JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to read JSON: ${err.message}`);
    process.exit(1);
  }

  let buffer;
  try {
    buffer = jsonToMotbin(moveset);
  } catch (err) {
    console.error(`Conversion failed: ${err.message}`);
    if (process.env.DEBUG) throw err;
    process.exit(1);
  }

  try {
    fs.writeFileSync(outputPath, buffer);
    console.log(`Written ${buffer.length} bytes to ${outputPath}`);
  } catch (err) {
    console.error(`Failed to write file: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { jsonToMotbin, computeBlockLayout };
