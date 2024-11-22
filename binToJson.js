const fs = require("fs");
const moment = require("moment");
const { getCharacterName: getCharacterName2 } = require("./utils");

// eslint-disable-next-line no-unused-vars
const to2ByteSigned = num => (num << 16) >> 16;

const t8StructSizes = {
  pushbacks: 0x10,
  pushback_extradata: 0x2,
  requirements: 0x14,
  cancel_extradata: 0x4,
  cancels: 0x28,
  group_cancels: 0x28,
  reactions: 0x70,
  hit_conditions: 0x18,
  extra_move_properties: 0x28,
  move_start_props: 0x20,
  move_end_props: 0x20,
  moves: 0x448,
  voiceclips: 0xc,
  input_extradata: 0x8,
  input_sequences: 0x10,
  projectiles: 0xd8,
  throw_extras: 0xc,
  throws: 0x10,
  unknown_parryrelated_list: 0x4,
  dialogues: 0x18,
};

function getInitialValues() {
  return {
    original_hash: "abc123", // random
    last_calculated_hash: "abc123",
    export_version: "1.0.1",
    version: "T8", // todo
    character_id: -1, // todo
    extraction_date: moment().format(),
    character_name: "",
    tekken_character_name: "",
    creator_name: 0,
    date: 0,
    fulldate: 0,
  }
}

function getCharacterId(moveset) {
  const [charId1, charId2] = [moveset.unknown_aliases[33], moveset.unknown_aliases[35]]
  return charId1 === 0 && charId2 === 1 ? 0 : charId2
}

function getCharacterName(moveset) {
  const [charId1, charId2] = [moveset.unknown_aliases[33], moveset.unknown_aliases[35]]
  return getCharacterName2(charId1 === 0 && charId2 === 1 ? 0 : charId2)
}

const offsetsList = [
  { name: "_0x0", offset: 0x0, size: 2 },
  { name: "is_initialized", offset: 0x2, size: 1 },
  { name: "_0x3", offset: 0x3, size: 1 },
  { name: "_0x4", offset: 0x4, size: 4 },
  { name: "_0x8", offset: 0x8, size: "string" },
  { name: "_0xC", offset: 0xc, size: 4 },
  {
    name: "character_name_addr",
    offset: 0x10,
    size: 8,
  },
  {
    name: "character_creator_addr",
    offset: 0x18,
    size: 8,
  },
  {
    name: "date_addr",
    offset: 0x20,
    size: 8,
  },
  {
    name: "fulldate_addr",
    offset: 0x28,
    size: 8,
  },
  {
    name: "original_aliases",
    offset: 0x30,
    size: [60, 2],
  },
  {
    name: "current_aliases",
    offset: 0xa8,
    size: [60, 2],
  },
  {
    name: "unknown_aliases",
    offset: 0x120,
    size: [36, 2],
  },
  {
    name: "ordinal_id1",
    offset: 0x160,
    size: 4,
  },
  {
    name: "ordinal_id2",
    offset: 0x164,
    size: 4,
  },
  { name: "reactions_ptr", offset: 0x168, size: 8 },
  { name: "reactions_count", offset: 0x178, size: 8 },
  { name: "requirements_ptr", offset: 0x180, size: 8 },
  { name: "requirements_count", offset: 0x188, size: 8 },
  { name: "hit_conditions_ptr", offset: 0x190, size: 8 },
  { name: "hit_conditions_count", offset: 0x198, size: 8 },
  { name: "projectiles_ptr", offset: 0x1a0, size: 8 },
  { name: "projectiles_count", offset: 0x1a8, size: 8 },
  { name: "pushbacks_ptr", offset: 0x1b0, size: 8 },
  { name: "pushbacks_count", offset: 0x1b8, size: 8 },
  { name: "pushback_extradata_ptr", offset: 0x1c0, size: 8 },
  { name: "pushback_extradata_count", offset: 0x1c8, size: 8 },
  { name: "cancels_ptr", offset: 0x1d0, size: 8 },
  { name: "cancels_count", offset: 0x1d8, size: 8 },
  { name: "group_cancels_ptr", offset: 0x1e0, size: 8 },
  { name: "group_cancels_count", offset: 0x1e8, size: 8 },
  { name: "cancel_extradata_ptr", offset: 0x1f0, size: 8 },
  { name: "cancel_extradata_count", offset: 0x1f8, size: 8 },
  { name: "extra_move_properties_ptr", offset: 0x200, size: 8 },
  { name: "extra_move_properties_count", offset: 0x208, size: 8 },
  { name: "move_start_props_ptr", offset: 0x210, size: 8 },
  { name: "move_start_props_count", offset: 0x218, size: 8 },
  { name: "move_end_props_ptr", offset: 0x220, size: 8 },
  { name: "move_end_props_count", offset: 0x228, size: 8 },
  { name: "moves_ptr", offset: 0x230, size: 8 },
  { name: "moves_count", offset: 0x238, size: 8 },
  { name: "voiceclips_ptr", offset: 0x240, size: 8 },
  { name: "voiceclips_count", offset: 0x248, size: 8 },
  { name: "input_sequences_ptr", offset: 0x250, size: 8 },
  { name: "input_sequences_count", offset: 0x258, size: 8 },
  { name: "input_extradata_ptr", offset: 0x260, size: 8 },
  { name: "input_extradata_count", offset: 0x268, size: 8 },
  { name: "unknown_parryrelated_list_ptr", offset: 0x270, size: 8 },
  { name: "unknown_parryrelated_list_count", offset: 0x278, size: 8 },
  { name: "throw_extras_ptr", offset: 0x280, size: 8 },
  { name: "throw_extras_count", offset: 0x288, size: 8 },
  { name: "throws_ptr", offset: 0x290, size: 8 },
  { name: "throws_count", offset: 0x298, size: 8 },
  { name: "dialogues_ptr", offset: 0x2a0, size: 8 },
  { name: "dialogues_count", offset: 0x2a8, size: 8 },
];

const cancelStruct = {
  command: { offset: 0x0, size: 8 },
  requirement_idx: { offset: 0x8, size: 8, parent: "requirements" },
  extradata_idx: { offset: 0x10, size: 8, parent: "cancel_extradata" },
  frame_window_start: { offset: 0x18, size: 4 },
  frame_window_end: { offset: 0x1c, size: 4 },
  starting_frame: { offset: 0x20, size: 4 },
  move_id: { offset: 0x24, size: 2 },
  cancel_option: { offset: 0x26, size: 2 },
};

const otherMovePropStruct = {
  requirement_idx: { offset: 0x0, size: 8, parent: "requirements" },
  id: { offset: 0x8, size: 4 },
  value: { offset: 0xc, size: 4 },
  value2: { offset: 0x10, size: 4 },
  value3: { offset: 0x14, size: 4 },
  value4: { offset: 0x18, size: 4 },
  value5: { offset: 0x1c, size: 4 },
};

const listOffsets = [
  {
    name: "reactions",
    offset: 0x168,
    size_offset: 0x10,
    item_struct: {
      // Array
      pushback_indexes: { offset: 0x0, size: [7, 8], parent: "pushbacks" },

      // Directions
      front_direction: { offset: 0x38, size: 2 },
      back_direction: { offset: 0x3a, size: 2 },
      left_side_direction: { offset: 0x3c, size: 2 },
      right_side_direction: { offset: 0x3e, size: 2 },
      front_counterhit_direction: { offset: 0x40, size: 2 },
      downed_direction: { offset: 0x42, size: 2 },

      // Rotations
      front_rotation: { offset: 0x44, size: 2 },
      back_rotation: { offset: 0x46, size: 2 },
      left_side_rotation: { offset: 0x48, size: 2 },
      right_side_rotation: { offset: 0x4a, size: 2 }, // Vertical pushback (a.k.a front_counterhit_rotation)
      vertical_pushback: { offset: 0x4c, size: 4 },
      downed_rotation: { offset: 0x4e, size: 2 },

      // Move IDs
      standing: { offset: 0x50, size: 2 },
      crouch: { offset: 0x52, size: 2 },
      ch: { offset: 0x54, size: 2 },
      crouch_ch: { offset: 0x56, size: 2 },
      left_side: { offset: 0x58, size: 2 },
      left_side_crouch: { offset: 0x5a, size: 2 },
      right_side: { offset: 0x5c, size: 2 },
      right_side_crouch: { offset: 0x5e, size: 2 },
      back: { offset: 0x60, size: 2 },
      back_crouch: { offset: 0x62, size: 2 },
      block: { offset: 0x64, size: 2 },
      crouch_block: { offset: 0x66, size: 2 },
      wallslump: { offset: 0x68, size: 2 },
      downed: { offset: 0x6a, size: 2 },
      unk1: { offset: 0x6c, size: 2 },
      unk2: { offset: 0x6e, size: 2 },
    },
  },
  {
    name: "requirements",
    offset: 0x180,
    item_struct: {
      req: { offset: 0x0, size: 4 },
      param: { offset: 0x4, size: 4 },
      param2: { offset: 0x8, size: 4 },
      param3: { offset: 0xc, size: 4 },
      param4: { offset: 0x10, size: 4 },
    },
  },
  {
    name: "hit_conditions",
    offset: 0x190,
    item_struct: {
      requirement_idx: { offset: 0x0, size: 8, parent: "requirements" },
      damage: { offset: 0x8, size: 4 },
      // _0xc: { offset: 0xc, size: 4 },
      reaction_list_idx: { offset: 0x10, size: 8, parent: "reactions" },
    },
  },
  {
    name: "projectiles",
    offset: 0x1a0,
    item_struct: {
      u1: { offset: 0x0, size: [35, 4] },
      hit_condition_idx: { offset: 0x90, size: 8, parent: "hit_conditions" },
      cancel_idx: { offset: 0x98, size: 8, parent: "cancels" },
      u2: { offset: 0xa0, size: [14, 4] },
    },
  },
  {
    name: "pushbacks",
    offset: 0x1b0,
    item_struct: {
      val1: { offset: 0x0, size: 2 },
      val2: { offset: 0x2, size: 2 },
      val3: { offset: 0x4, size: 4 },
      pushbackextra_idx: { offset: 0x8, size: 8, parent: "pushback_extradata" },
    },
  },
  {
    name: "pushback_extradata",
    offset: 0x1c0,
    item_struct: {
      value: { offset: 0x0, size: 2 },
    },
  },
  {
    name: "cancels",
    offset: 0x1d0,
    item_struct: cancelStruct,
  },
  {
    name: "group_cancels",
    offset: 0x1e0,
    item_struct: cancelStruct,
  },
  {
    name: "cancel_extradata",
    offset: 0x1f0,
    item_struct: {
      value: { offset: 0x0, size: 4 },
    },
  },
  {
    name: "extra_move_properties",
    offset: 0x200,
    item_struct: {
      type: { offset: 0x0, size: 4 },
      _0x4: { offset: 0x4, size: 4 },
      requirement_idx: { offset: 0x8, size: 8, parent: "requirements" },
      id: { offset: 0x10, size: 4 },
      value: { offset: 0x14, size: 4 },
      value2: { offset: 0x18, size: 4 },
      value3: { offset: 0x1c, size: 4 },
      value4: { offset: 0x20, size: 4 },
      value5: { offset: 0x24, size: 4 },
    },
  },
  {
    name: "move_start_props",
    offset: 0x210,
    item_struct: otherMovePropStruct,
  },
  {
    name: "move_end_props",
    offset: 0x220,
    item_struct: otherMovePropStruct,
  },
  {
    name: "moves",
    offset: 0x230,
    item_struct: {
      anim_key1: { offset: 0x50, size: 4 },
      anim_key2: { offset: 0x54, size: 4 },
      cancel_idx: { offset: 0x98, size: 8, parent: "cancels" },
      hit_condition_idx: { offset: 0x110, size: 8, parent: "hit_conditions" },
      transition: { offset: 0xCC, size: 2 },
      _0xCE: { offset: 0xCE, size: 2 },
      anim_max_length: { offset: 0x120, size: 4 },
      airborne_start: { offset: 0x124, size: 4 },
      airborne_end: { offset: 0x128, size: 4 },
      ground_fall: { offset: 0x12C, size: 4 },
      voiceclip_idx: { offset: 0x130, size: 8, parent: "voiceclips" },
      extra_properties_idx: { offset: 0x138, size: 8, parent: "extra_move_properties" },
      move_start_properties_idx: { offset: 0x140, size: 8, parent: "move_start_props" },
      move_end_properties_idx: { offset: 0x148, size: 8, parent: "move_end_props" },
      u15: { offset: 0x150, size: 4 },
      _0x154: { offset: 0x154, size: 4 },
      startup: { offset: 0x158, size: 4 },
      recovery: { offset: 0x15C, size: 4 },
      _0x444: { offset: 0x444, size: 4 },
    },
  },
  {
    name: "voiceclips",
    offset: 0x240,
    item_struct: {
      val1: { offset: 0x0, size: 4 },
      val2: { offset: 0x4, size: 4 },
      val3: { offset: 0x8, size: 4 },
    },
  },
  {
    name: "input_sequences",
    offset: 0x250,
    item_struct: {
      u1: { offset: 0x0, size: 2 },
      u2: { offset: 0x2, size: 2 },
      u3: { offset: 0x4, size: 4 },
      extradata_idx: { offset: 0x8, size: 8, parent: "input_extradata" },
    },
  },
  {
    name: "input_extradata",
    offset: 0x260,
    item_struct: {
      value: { offset: 0x0, size: 8 },
    },
  },
  {
    name: "unknown_parryrelated_list",
    offset: 0x270,
    item_struct: {
      value: { offset: 0x0, size: 4 },
    },
  },
  {
    name: "throw_extras",
    offset: 0x280,
    item_struct: {
      u1: { offset: 0x0, size: 4 },
      u2: { offset: 0x4, size: [4, 2] },
    },
  },
  {
    name: "throws",
    offset: 0x290,
    item_struct: {
      u1: { offset: 0x0, size: 8 },
      throwextra_idx: { offset: 0x8, size: 8, parent: "throw_extras" },
    },
  },
  {
    name: "dialogues",
    offset: 0x2a0,
    item_struct: {
      type: { offset: 0x0, size: 2 },
      id: { offset: 0x2, size: 2 },
      _0x4: { offset: 0x4, size: 4 },
      requirement_idx: { offset: 0x8, size: 8, parent: "requirements" },
      voiceclip_key: { offset: 0xc, size: 4 },
      facial_anim_idx: { offset: 0x10, size: 4 },
    },
  },
];

/**
 * Method to read from the file
 * @param {Buffer} buffer
 * @param {number} offset
 * @param {number} size
 * @returns {any}
 */
function readInt(buffer, offset, size) {
  switch (size) {
    case 1:
      return buffer.readUInt8(offset);
    case 2:
      return buffer.readUInt16LE(offset);
    case 4:
      return buffer.readUInt32LE(offset);
    case 8: {
      return buffer.readBigUInt64LE(offset);
    }
    default:
      return undefined;
  }
}

/**
 * Method to read a null-terminated string from the buffer
 * @param {Buffer} buffer
 * @param {number} offset
 * @returns {string}
 */
function readString(buffer, offset) {
  let end = offset;
  // Find the null terminator (\0)
  while (end < buffer.length && buffer[end] !== 0) {
    end++;
  }
  // Read the string up to the null terminator
  return buffer.slice(offset, end).toString("utf-8");
}

/**
 * Method to read from the file
 * @param {Buffer} buffer
 * @param {number} offset
 * @param {number | string | Array<number>} size
 * @returns {any}
 */
function read(buffer, offset, size = 4) {
  switch (typeof size) {
    case "number":
      return readInt(buffer, offset, size);
    case "string":
      return readString(buffer, offset);
    case "object":
      return Array(size[0])
        .fill(0)
        .map((_, i) => readInt(buffer, offset + i * size[1], size[1]));
    default:
      return undefined;
  }
}

/**
 * Reads a binary file and extracts specific byte values.
 * @param {string} filePath - The path to the binary file.
 * @returns {object} - An object containing the extracted values.
 */
function parseBinaryFile(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);

    const moveset = getInitialValues();

    const addrToIdx = (addr, key) => {
      const start = moveset[`${key}_ptr`];
      const size = t8StructSizes[key];
      return (Number(addr) - Number(start)) / size;
    };

    const startAddress = buffer.readBigUInt64LE(0);
    // const endAddress = buffer.readBigUint64LE(8);

    offsetsList.forEach(({ name, offset, size }) => {
      moveset[name] = read(buffer, offset + 16, size);
    });

    listOffsets.forEach(
      ({
        name,
        offset,
        size_offset: sizeOffset = 0x8,
        item_struct: structure,
      }) => {
        console.log(`Reading ${name}...`);
        const count = read(buffer, offset + 16 + sizeOffset, 4);
        const start = read(buffer, offset + 16, 8) - startAddress;

        const list = [];
        for (let i = 0; i < count; i++) {
          let error = false;
          const itemOffset = Number(start) + 16 + t8StructSizes[name] * i;
          const item = {};
          Object.entries(structure).forEach(([key, value]) => {
            try {
              const val = read(buffer, itemOffset + value.offset, value.size);
              item[key] = val;
              // Calculating Index
              if (value.parent) {
                if (Array.isArray(item[key])) {
                  item[key] = item[key].map(x => addrToIdx(x, value.parent));
                } else {
                  item[key] = addrToIdx(item[key], value.parent);
                }
              }
            } catch (err) {
              console.error(`idx: ${i}, ${itemOffset}`);
              error = true;
            }
          });
          if (!error) list.push(item);
        }
        moveset[name] = list;

        if (
          [
            "pushback_extradata",
            "cancel_extradata",
            "input_extradata",
            "unknown_parryrelated_list",
          ].includes(name)
        ) {
          moveset[name] = list.map(x => x.value);
        }
      },
    );

    offsetsList.forEach(({ name }) => {
      if (name.endsWith("_ptr") || name.endsWith("_count")) {
        delete moveset[name];
      }
    });

    // Setting some fields
    const name = getCharacterName(moveset);
    moveset.version = "Tekken8";
    moveset.character_id = getCharacterId(moveset);
    moveset.character_name = "t8_" + name.slice(1, -1);
    moveset.tekken_character_name = name;

    // Deleting some fields
    delete moveset._0x0
    delete moveset.is_initialized
    delete moveset._0x3
    delete moveset._0x8
    delete moveset._0xC
    delete moveset.character_name_addr
    delete moveset.character_creator_addr
    delete moveset.date_addr
    delete moveset.fulldate_addr
    delete moveset.ordinal_id1
    delete moveset.ordinal_id2

    return moveset;
  } catch (error) {
    console.error("Error reading the binary file:", error);
    return null;
  }
}

function main() {
  const result = parseBinaryFile("./extracted_chars_v1_09_bin/t8_ALISA.bin");
  ////////////////////////////////////////////

  fs.writeFileSync(
    "./test.json",
    JSON.stringify(result, (_, value) =>
      typeof value === "bigint" ? Number(value) : value
    )
  )
  // console.log(Object.keys(result));
  // console.log(result.voiceclips);
}

main();
