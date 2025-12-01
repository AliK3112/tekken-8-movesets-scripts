const { readdirSync, statSync } = require("fs");
const _ = require('lodash');
const { join } = require("path");
const BinaryFileReader = require('./binaryFileReader');

const PATH = "./extracted_chars_2_02"

function hex(number, length = 8) {
  let x = typeof number === "string" ? parseInt(number) : number
  if (x < 0) {
    x = x >>> 0
  }
  return "0x" + x.toString(16).padStart(length, "0")
}

function toSignedInt32(unsignedInt) {
  return unsignedInt | 0
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
    if (ascending) return object[a] - object[b]
    return object[b] - object[a]
  });
  sortedValues.forEach(value => console.log(hex(+value, 8), "-", object[value]));
  // sortedValues.forEach(value => console.log(value, "-", object[value]));
}

function printObject(object) {
  Object.entries(object).forEach(([key, value], i) => {
    console.log(`${i} ${hex(key, 8)} (${toSignedInt32(key)}) - ${value}`)
  });
  // Object.entries(object).forEach(([key, value]) => console.log(key, "-", value));
}

function sortByGameId(array) {
  const fn = s => s.split("/").at(-1).slice(3).split(".").at(0)
  
  const obj = {}
  Object.entries(CHARACTER_NAMES).forEach(([key, value]) => {
    obj[value.slice(1, -1)] = +key
  })
  array.sort((a, b) => obj[fn(a)] - obj[fn(b)])
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
    return CHARACTER_NAMES[(charId1 - 1) / 0xFFFF] || '__UNKNOWN__';
  } else if (typeof parameter === 'number') {
    return CHARACTER_NAMES[parameter] || '__UNKNOWN__';
  } else {
    return '__UNKNOWN__';
  }
}

const CHARACTER_NAMES = {
  0: '[PAUL]',
  1: '[LAW]',
  2: '[KING]',
  3: '[YOSHIMITSU]',
  4: '[HWOARANG]',
  5: '[XIAYOU]',
  6: '[JIN]',
  7: '[BRYAN]',
  8: '[KAZUYA]',
  9: '[STEVE]',
  10: '[JACK8]',
  11: '[ASUKA]',
  12: '[DEVIL_JIN]',
  13: '[FENG]',
  14: '[LILI]',
  15: '[DRAGUNOV]',
  16: '[LEO]',
  17: '[LARS]',
  18: '[ALISA]',
  19: '[CLAUDIO]',
  20: '[SHAHEEN]',
  21: '[NINA]',
  22: '[LEE]',
  23: '[KUMA]',
  24: '[PANDA]',
  25: '[ZAFINA]',
  26: '[LEROY]',
  27: '[JUN]',
  28: '[REINA]',
  29: '[AZUCENA]',
  30: '[VICTOR]',
  31: '[RAVEN]',
  32: '[AZAZEL]',
  33: '[EDDY]',
  34: '[LIDIA]',
  35: '[HEIHACHI]',
  36: '[CLIVE]',
  37: '[ANNA]',
  38: '[FAHKUMRAM]',
  39: '[ARMOR_KING]',
  40: '[MIARY_ZO]',
  116: '[DUMMY]',
  117: '[ANGEL_JIN]',
  118: '[TRUE_DEVIL_KAZUYA]',
  119: '[JACK7]',
  120: '[SOLDIER]',
  121: '[DEVIL_JIN_2]',
  122: '[TEKKEN_MONK]',
  123: '[SEIRYU]',
  128: '[DUMMY]',
}

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
  xxa: 117,
  xxb: 118,
  xxc: 119,
  xxd: 120,
  xxe: 121,
  xxf: 122,
  xxg: 123,
  zbr: 28,
};

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
  if (typeof input !== 'number' && typeof input !== 'bigint') {
      throw new TypeError('Input must be a number or BigInt');
  }

  let hex = input.toString(16);
  if (hex.length % 2 !== 0) hex = '0' + hex;

  const bytes = [];
  for (let i = hex.length; i > 0; i -= 2) {
      bytes.push(hex.slice(i - 2, i).toUpperCase());
  }

  return bytes;
}

function decryptAttackType(value) {
  // Step 1: XOR with 0x1D
  let res = (value ^ 0x1D); // ensure unsigned

  // Step 2: Shift left by 28 bits (simulate with multiplication to avoid overflow)
  // res = (res * Math.pow(2, 28));
  res = res << 0x1C;

  // Step 3: Divide by 16, ensure unsigned 32-bit result
  res = Math.floor(res / 16);

  // Step 4: Convert to little-endian byte array
  let bytes = [
      res & 0xFF,
      (res >>> 8) & 0xFF,
      (res >>> 16) & 0xFF,
      (res >>> 24) & 0xFF
  ];

  // Step 5: Reverse the bytes (to simulate Array.Reverse in C#)
  bytes.reverse();

  // Step 6: Reconstruct unsigned 32-bit integer
  let final = (
      (bytes[0] << 24) |
      (bytes[1] << 16) |
      (bytes[2] << 8) |
      bytes[3]
  );

  return final;
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
  PATH,
  CODE_MAPPING,
  CHARACTER_NAMES,
}
