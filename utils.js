const { readdirSync, statSync } = require("fs");
const _ = require("lodash");
const { join } = require("path");
const BinaryFileReader = require("./binaryFileReader");

const PATH = "./extracted_chars_2_02";

function hex(number, length = 8) {
  let x = typeof number === "string" ? parseInt(number) : number;
  if (x < 0) {
    x = x >>> 0;
  }
  return "0x" + x.toString(16).padStart(length, "0");
}

function toSignedInt32(unsignedInt) {
  return unsignedInt | 0;
}

function getAllFiles(dir = PATH) {
  const jsonPaths = [];

  function readDirRecursive(currentPath) {
    const items = readdirSync(currentPath);

    for (const item of items) {
      if (item === ".DS_Store") continue;

      const itemPath = join(currentPath, item);
      const itemStat = statSync(itemPath);

      if (itemStat.isDirectory()) {
        readDirRecursive(itemPath);
      } else if (item.endsWith(".json")) {
        jsonPaths.push(itemPath);
      }
    }
  }

  readDirRecursive(dir);
  return jsonPaths;
}

function printInOrder(object, ascending = true) {
  const sortedValues = Object.keys(object).sort((a, b) => {
    if (ascending) return object[a] - object[b];
    return object[b] - object[a];
  });
  sortedValues.forEach((value) =>
    console.log(hex(+value, 8), "-", object[value]),
  );
  // sortedValues.forEach(value => console.log(value, "-", object[value]));
}

function printObject(object) {
  Object.entries(object).forEach(([key, value], i) => {
    console.log(`${i} ${hex(key, 8)} (${toSignedInt32(key)}) - ${value}`);
  });
  // Object.entries(object).forEach(([key, value]) => console.log(key, "-", value));
}

function sortByGameId(array) {
  const fn = (s) => s.split("/").at(-1).slice(3).split(".").at(0);

  const obj = {};
  Object.entries(CHARACTER_NAMES).forEach(([key, value]) => {
    obj[value.slice(1, -1)] = +key;
  });
  array.sort((a, b) => obj[fn(a)] - obj[fn(b)]);
  return array;
}

/**
 * Returns Character Name
 * @param {number|BinaryFileReader} parameter - Can be a BinaryFileReader instance or an integer
 * @returns {string}
 */
function getCharacterName(parameter) {
  if (parameter instanceof BinaryFileReader) {
    const charId1 = parameter.readInt(0x160);
    return CHARACTER_NAMES[(charId1 - 1) / 0xffff] || "__UNKNOWN__";
  } else if (typeof parameter === "number") {
    return CHARACTER_NAMES[parameter] || "__UNKNOWN__";
  } else {
    return "__UNKNOWN__";
  }
}

const CHARACTER_NAMES = {
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
  116: "[DUMMY]",
  117: "[ANGEL_JIN]",
  118: "[TRUE_DEVIL_KAZUYA]",
  119: "[JACK7]",
  120: "[SOLDIER]",
  121: "[DEVIL_JIN_2]",
  122: "[TEKKEN_MONK]",
  123: "[SEIRYU]",
  128: "[DUMMY]",
};

const CODE_MAPPING = {
  aml: 27,
  ant: 6,
  bbn: 31,
  bee: 35,
  bsn: 9,
  cat: 29,
  cbr: 34,
  ccn: 10,
  cht: 7,
  cml: 3,
  crw: 25,
  ctr: 19,
  der: 11,
  dog: 33,
  ghp: 16,
  got: 32,
  grf: 0,
  grl: 8,
  hms: 14,
  hrs: 20,
  jly: 26,
  kal: 21,
  kgr: 37,
  klw: 13,
  kmd: 15,
  knk: 39,
  lon: 30,
  lzd: 17,
  mnt: 18,
  okm: 36,
  pgn: 2,
  pig: 1,
  rat: 5,
  rbt: 23,
  snk: 4,
  swl: 12,
  test: 128,
  tgr: 38,
  ttr: 24,
  wlf: 22,
  wkz: 40,
  xxa: 117,
  xxb: 118,
  xxc: 119,
  xxd: 120,
  xxe: 121,
  xxf: 122,
  xxg: 123,
  zbr: 28,
};

function getCodeById(id) {
  return Object.keys(CODE_MAPPING).find((key) => CODE_MAPPING[key] === id);
}

function camelToTitle(str) {
  return _.startCase(_.camelCase(str));
}

function getAliasId(moveId, moveset) {
  const index = moveset.original_aliases.indexOf(moveId);
  if (index !== -1) {
    return 32768 + index;
  }
  return moveId;
}

function toLittleEndianHexArray(input) {
  if (typeof input !== "number" && typeof input !== "bigint") {
    throw new TypeError("Input must be a number or BigInt");
  }

  let hex = input.toString(16);
  if (hex.length % 2 !== 0) hex = "0" + hex;

  const bytes = [];
  for (let i = hex.length; i > 0; i -= 2) {
    bytes.push(hex.slice(i - 2, i).toUpperCase());
  }

  return bytes;
}

function decryptAttackType(value) {
  // Step 1: XOR with 0x1D
  let res = value ^ 0x1d; // ensure unsigned

  // Step 2: Shift left by 28 bits (simulate with multiplication to avoid overflow)
  // res = (res * Math.pow(2, 28));
  res = res << 0x1c;

  // Step 3: Divide by 16, ensure unsigned 32-bit result
  res = Math.floor(res / 16);

  // Step 4: Convert to little-endian byte array
  let bytes = [
    res & 0xff,
    (res >>> 8) & 0xff,
    (res >>> 16) & 0xff,
    (res >>> 24) & 0xff,
  ];

  // Step 5: Reverse the bytes (to simulate Array.Reverse in C#)
  bytes.reverse();

  // Step 6: Reconstruct unsigned 32-bit integer
  let final = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];

  return final;
}

const KEYS = [
  0x964f5b9e, 0xd88448a2, 0xa84b71e0, 0xa27d5221, 0x9b81329f, 0xadfb76c8,
  0x7def1f1c, 0x7ee2bc2c,
];

const getByte = (value, byteNumber) => (value >>> (byteNumber * 8)) & 0xff;

const decryptBytes = (moveBytes, attributeOffset, moveIdx) => {
  let currentOffset = attributeOffset;
  for (let j = 0; j < KEYS.length; j++) {
    const key = KEYS[j];
    for (let k = 0; k < 4; k++) {
      moveBytes[currentOffset + k] ^= getByte(key, k);
    }
    currentOffset += 4;
  }
  return Buffer.from(moveBytes).readUInt32LE(
    attributeOffset + 4 * (moveIdx % 8),
  );
};

// ---- Helpers ----

const TK__Encrypted = (c, pos) => ({
  value: {
    value: c.readUInt64(pos),
    key: c.readUInt64(pos + 0x8),
  },
  size: 0x10,
});

const TK__MoveHitbox = (c, pos) => ({
  value: {
    startup: c.readUInt32(pos + 0x0),
    recovery: c.readUInt32(pos + 0x4),
    location: c.readUInt32(pos + 0x8),
    related_floats: Array.from({ length: 9 }, (_, i) =>
      c.readFloat32(pos + 0xc + i * 4),
    ),
  },
  size: 0x30, // 3*4 + 9*4
});

const TK__MoveUnknown = (c, pos) => ({
  value: {
    _0x0: Array.from({ length: 3 }, (_, i) => c.readInt32(pos + i * 4)),
    _0xC: Array.from({ length: 3 }, (_, i) => c.readFloat32(pos + 0xc + i * 4)),
    _0x14: c.readUInt32(pos + 0x18),
    _0x18: Array.from({ length: 3 }, (_, i) =>
      c.readFloat32(pos + 0x1c + i * 4),
    ),
    _0x24: c.readUInt32(pos + 0x28),
  },
  size: 0x2c,
});

// ---- Main struct ----

const TK__Move = (c, pos, i) => {
  const readEncrypted = (off) => TK__Encrypted(c, pos + off).value;

  const readLong = (offset) => Number(c.readInt64(offset));

  const bytes = c.readArrayOfBytes(0x448, pos);
  const nameKey = decryptBytes(bytes, 0x0, i);
  const animKey = decryptBytes(bytes, 0x20, i);
  const hurtbox = decryptBytes(bytes, 0x58, i);
  const hitLevel = decryptBytes(bytes, 0x78, i);
  const ordinal1 = decryptBytes(bytes, 0xd0, i);
  const ordinal2 = decryptBytes(bytes, 0xf0, i);

  const move = {
    index: i,
    name_key: nameKey,
    // name_key_related: Array.from({ length: 4 }, (_, i) =>
    //   c.readUInt32(pos + 0x10 + i * 4)
    // ),

    anim_name_key: animKey,
    // anim_name_key_related: Array.from({ length: 4 }, (_, i) =>
    //   c.readUInt32(pos + 0x30 + i * 4)
    // ),

    name_idx: readLong(pos + 0x40),
    anim_name_idx: readLong(pos + 0x48),
    anim_key1: c.readUInt32(pos + 0x50),
    anim_key2: c.readUInt32(pos + 0x54),

    hit_level: hitLevel,
    // hit_level_related: Array.from({ length: 4 }, (_, i) =>
    //   c.readUInt32(pos + 0x68 + i * 4)
    // ),

    vuln: hurtbox,
    // vuln_related: Array.from({ length: 4 }, (_, i) =>
    //   c.readUInt32(pos + 0x88 + i * 4)
    // ),

    cancel_idx: readLong(pos + 0x98),
    cancel1_idx: readLong(pos + 0xa0),
    cancel1_related: c.readInt32(pos + 0xa8),
    cancel1_related2: c.readInt32(pos + 0xac),
    cancel2_idx: readLong(pos + 0xb0),
    cancel2_related: c.readInt32(pos + 0xb8),
    cancel2_related2: c.readInt32(pos + 0xbc),
    cancel_idx3: readLong(pos + 0xc0),
    cancel3_related: c.readUInt32(pos + 0xc8),
    transition: c.readUInt16(pos + 0xcc),
    _0xCE: c.readUInt16(pos + 0xce),

    ordinal_id1: ordinal1,
    // ordinal_id1_related: Array.from({ length: 4 }, (_, i) =>
    //   c.readUInt32(pos + 0xE0 + i * 4)
    // ),

    ordinal_id2: ordinal2,
    // ordinal_id2_related: Array.from({ length: 4 }, (_, i) =>
    //   c.readUInt32(pos + 0x100 + i * 4)
    // ),

    hit_condition_idx: readLong(pos + 0x110),
    _0x118: c.readUInt32(pos + 0x118),
    _0x11C: c.readUInt32(pos + 0x11c),
    anim_max_length: c.readUInt32(pos + 0x120),
    airborne_start: c.readUInt32(pos + 0x124),
    airborne_end: c.readUInt32(pos + 0x128),
    ground_fall: c.readUInt32(pos + 0x12c),
    voiceclip_idx: readLong(pos + 0x130),
    extra_properties_idx: readLong(pos + 0x138),
    move_start_properties_idx: readLong(pos + 0x140),
    move_end_properties_idx: readLong(pos + 0x148),
    u15: c.readUInt32(pos + 0x150),
    _0x154: c.readUInt32(pos + 0x154),
    startup: c.readUInt32(pos + 0x158),
    recovery: c.readUInt32(pos + 0x15c),

    hitboxes: Array.from(
      { length: 8 },
      (_, i) => TK__MoveHitbox(c, pos + 0x160 + i * 0x30).value,
    ),

    _0x2E0: c.readUInt32(pos + 0x2e0),

    _0x2E4: Array.from(
      { length: 8 },
      (_, i) => TK__MoveUnknown(c, pos + 0x2e4 + i * 0x2c).value,
    ),

    _0x444: c.readUInt32(pos + 0x444),
  };

  return { value: move, size: 0x448 };
};

// ---- Usage ----
// const move = reader.read(TK__Move, addr);

/**
 * Returns a moves array
 * @param {BinaryFileReader} reader
 */
function readMovesList(reader) {
  if ((!reader) instanceof BinaryFileReader) return [];

  const DICT = require("./name_keys.json");

  const readLong = (offset) => Number(reader.readUInt64(offset));

  const readMoveNameOffset = (addr) => readLong(addr + 0x40);
  const readAnimNameOffset = (addr) => readLong(addr + 0x48);

  const stringBlockEnd = reader.readInt(0x170);
  const start = readLong(0x230) + 0x318;
  const count = readLong(0x238);

  const array = [];
  for (let i = 0; i < count; i++) {
    const addr = start + i * 0x448;
    const move = reader.read((c) => TK__Move(c, addr, i));

    const offset1 = move.name_idx;
    const offset2 = move.anim_name_idx;
    const nameLength = offset2 - offset1 - 1;
    let animLength = 0;
    if (i + 1 < count) {
      animLength = readMoveNameOffset(addr + 0x448) - offset2;
    } else {
      animLength = stringBlockEnd - offset2;
    }
    animLength--;
    // console.log(move);
    array.push({
      ...move,
      name: DICT[move.name_key],
      name_length: nameLength,
      anim_name_length: animLength,
    });
    // break;
  }
  return array;
}

module.exports = {
  print: (...args) => console.log(...args),
  hex,
  toSignedInt32,
  getAllFiles,
  printInOrder,
  printObject,
  getCharacterName,
  sortByGameId,
  camelToTitle,
  getAliasId,
  toLittleEndianHexArray,
  decryptAttackType,
  readMovesList,
  getCodeById,
  PATH,
  CODE_MAPPING,
  CHARACTER_NAMES,
};
