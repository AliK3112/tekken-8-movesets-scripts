const { readdirSync, statSync } = require("fs");
const _ = require('lodash');
const { join } = require("path");

// const PATH = "./extracted_chars_1_09"
const PATH = "./extracted_chars_2_00_01"

function hex(number, length = 8) {
  return "0x" + parseInt(number).toString(16).padStart(length, "0")
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
  Object.entries(object).forEach(([key, value]) => {
    console.log(`${hex(key, 8)} (${toSignedInt32(key)}) - ${value}`)
  });
  // Object.entries(object).forEach(([key, value]) => console.log(key, "-", value));
}

/**
 * Extracts the characters name from the file
 * @param {string} filepath 
 */
const fn = (filepath) => _.last(filepath.split(/[\/\\]+/)).slice(3).split('.')[0]

function sortByGameId(array) {
  const obj = {}
  Object.entries(CHARACTER_NAMES).forEach(([key, value]) => {
    obj[value.slice(1, -1)] = +key
  })
  array.sort((a, b) => obj[fn(a)] - obj[fn(b)])
  return array;
}

function getCharacterName(fileReader) {
  if (fileReader.readInt) {
    const charId1 = Math.abs((fileReader.readInt(0x160) - 1) / 0xFFFF)
    return CHARACTER_NAMES[charId1]
  } else {
    return CHARACTER_NAMES[fileReader] || '__UNKNOWN__'
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
  116: '[DUMMY]',
  117: '[ANGEL_JIN]',
  118: '[TRUE_DEVIL_KAZUYA]',
  119: '[JACK7]',
  120: '[SOLDIER]',
  121: '[DEVIL_JIN_2]',
  122: '[TEKKEN_MONK]',
  123: '[SEIRYU]'
}

function camelToTitle(str) {
  return _.startCase(_.camelCase(str));
}

function fnv1a32FromBuffer(str) {
  const FNV_OFFSET_BASIS = 0x811c9dc5; // 2166136261
  const FNV_PRIME = 0x01000193;       // 16777619

  let hash = FNV_OFFSET_BASIS >>> 0;
  const buf = Buffer.from(str, 'utf8');

  for (let i = 0; i < buf.length; i++) {
    hash ^= buf[i];
    // multiply by FNV_PRIME (32-bit overflow)
    hash = (hash >>> 0) * FNV_PRIME >>> 0;
    // (JavaScript does 64-bit float math, so we force 32-bit by >>>0)
  }

  return hash >>> 0; // ensure unsigned 32-bit
};

function getCharCode(charId) {
  switch (charId) {
    case 0:  return "grf"; // Paul
    case 1:  return "pig"; // Law
    case 2:  return "pgn"; // King
    case 3:  return "cml"; // Yoshimitsu
    case 4:  return "snk"; // Hwoarang
    case 5:  return "rat"; // Xiayou
    case 6:  return "ant"; // Jin
    case 7:  return "cht"; // Bryan
    case 8:  return "grl"; // Kazuya
    case 9:  return "bsn"; // Steve
    case 10: return "ccn"; // Jack8
    case 11: return "der"; // Asuka
    case 12: return "swl"; // DevilJin
    case 13: return "klw"; // Feng
    case 14: return "hms"; // Lili
    case 15: return "kmd"; // Dragunov
    case 16: return "ghp"; // Leo
    case 17: return "lzd"; // Lars
    case 18: return "mnt"; // Alisa
    case 19: return "ctr"; // Claudio
    case 20: return "hrs"; // Shaheen
    case 21: return "kal"; // Nina
    case 22: return "wlf"; // Lee
    case 23: return "rbt"; // Kuma
    case 24: return "ttr"; // Panda
    case 25: return "crw"; // Zafina
    case 26: return "jly"; // Leroy
    case 27: return "aml"; // Jun
    case 28: return "zbr"; // Reina
    case 29: return "cat"; // Azucena
    case 30: return "lon"; // Victor
    case 31: return "bbn"; // Raven
    case 32: return "got"; // Azazel
    case 33: return "dog"; // Eddy
    case 34: return "cbr"; // Lidia
    case 35: return "bee"; // Heihachi
    case 36: return "okm"; // Clive
    case 37: return "kgr"; // Anna
    case 38: return "tgr"; // Fahkumram
    case 39: return "knk"; // Armor King
    case 116: return "dek"; // Dummy
    case 117: return "xxa"; // AngelJin
    case 118: return "xxb"; // TrueDevilKazuya
    case 119: return "xxc"; // Jack7
    case 120: return "xxd"; // Soldier
    case 121: return "xxe"; // DevilJin2
    case 122: return "xxf"; // TekkenMonk
    case 123: return "xxg"; // Seiryu
    default:
      return "Unknown";
  }
}

module.exports = {
  print: (...args) => console.log(...args),
  hex,
  getCharCode,
  toSignedInt32,
  getAllFiles,
  printInOrder,
  printObject,
  getCharacterName,
  sortByGameId,
  camelToTitle,
  fnv1a32FromBuffer,
  PATH,
  CHARACTER_NAMES,
}
