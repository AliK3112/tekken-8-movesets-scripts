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
  PATH,
  CHARACTER_NAMES,
}
