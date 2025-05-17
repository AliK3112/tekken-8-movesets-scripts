const fs = require("fs");
const { hex } = require("./utils");

const print = (...args) => console.log(...args);

let oldMoveset = {}
let newMoveset = {}

const propMapping = {}

const readingMapper = () => {
  const parse = (val) => {
    try {
      if (val.startsWith("0x")) return parseInt(val, 16);
      return parseInt(val);
    } catch {
      return -1;
    }
  };

  try {
    const data = fs.readFileSync("./experiment/mapping.txt", "utf8");
    const lines = data.split("\n").filter((line) => line.trim().length > 0);
    lines.slice(1).forEach((line) => {
      const [v1, v2] = line.split(",").map(parse);
      if (v1 > 0 && v2 > 0) propMapping[v1] = v2;
    });
    // console.log(propMapping);
  } catch {
    //
  }
};

readingMapper()

function parseFileSync(filePath) {
  try {
    // Read the file synchronously
    const data = fs.readFileSync(filePath, "utf8");

    // Split the file content by newlines and filter out empty lines
    const lines = data.split("\n").filter((line) => line.trim().length > 0);

    // Assume the first line is the header
    const headers = lines[0].trim().split(/\s+/);
    headers.shift(); // removing "INDEX" column

    // Process each subsequent line to convert it into an object
    const parsedData = lines.slice(1).map((line) => {
      const values = line.trim().split(/\s+/);
      values.shift(); // removing "INDEX" column

      const entry = {};

      headers.forEach((header, index) => {
        entry[header] = +values[index];
      });

      return entry;
    });

    return parsedData;
  } catch (err) {
    console.error("Error reading or parsing file:", err);
    throw err;
  }
}

function getExtraprops(move, moveset) {
  let idx = move.extra_properties_idx;
  if (idx < 0) return [];
  const arr = [];
  do {
    const prop = moveset.extra_move_properties[idx];
    idx++;
    arr.push(prop);
    if (prop.id === 0 && prop.type === 0 && prop.value === 0) break;
  } while (idx < moveset.extra_move_properties.length);
  return arr;
}

const propListMatches = (oldProps, newProps) => {
  if (oldProps.length !== newProps.length) {
    console.log("Prop list length mismatch");
    return false;
  }

  const match = (o1, o2) => {
    const mProp = propMapping[o1.id] ?? o1.id;
    return o1.type === o2.type && o1.value === o2.value && mProp === o2.id;
  };

  for (let i = 0; i < oldProps.length; i++) {
    const oldProp = oldProps[i];
    const newProp = newProps[i];
    if (!match(oldProp, newProp)) {
      console.log("Prop list mismatch");
      return false;
    }
  }
  return true;
};

function getCancelsLength(move, moveset) {
  let idx = move.cancel_idx;
  do {
    const cancel = moveset.cancels[idx];
    idx++;
    if (cancel.command === 0x8000) {
      break;
    }
  } while (idx < moveset.cancels.length);
  return idx - move.cancel_idx;
}

function isSimilar(oldMove, newMove) {
  if (oldMove.name.length !== newMove.name_len) {
    console.log(`length mismatch: ${oldMove.name.length} - ${newMove.name_len}`)
    return false;
  }

  const match = (key) => {
    const flag = oldMove[key] === newMove[key];
    if (!flag) console.log("key mismatch: ", key);
    return flag;
  };

  const match2 = (k1, k2) => {
    const flag = oldMove[k1] === newMove[k2];
    if (!flag) console.log(`key mismatch: ${k1} - ${k2}`);
    return flag;
  }

  // Can't match indexes but can atleast see if both are 0 or -1
  const matchIdx = (key) => {
    const fn = (x) => [-1, 0].includes(x);
    return fn(oldMove[key]) && fn(newMove[key])
      ? oldMove[key] === newMove[key]
      : true;
  };

  const [u16, u17] = [newMove.u17 & 0xffff, (newMove.u17 >> 16) & 0xffff];
  newMove.u16 = u16;
  newMove.u17 = u17;

  const oldProps = getExtraprops(oldMove, oldMoveset);
  const newProps = getExtraprops(newMove, newMoveset);
  
  const cancelsLenMatch = () =>
    getCancelsLength(oldMove, oldMoveset) ===
    getCancelsLength(newMove, newMoveset);
  
  return (
    match("vuln") &&
    match("hitlevel") &&
    match("transition") &&
    matchIdx("voiceclip_idx") &&
    matchIdx("extra_properties_idx") &&
    matchIdx("hit_condition_idx") &&
    match("hitbox_location") &&
    match("first_active_frame") &&
    match("last_active_frame") &&
    match2("u10", "airborne_start") &&
    match2("u11", "airborne_end") &&
    match2("u12", "ground_fall") &&
    match("u15") &&
    match("u16") &&
    cancelsLenMatch() &&
    propListMatches(oldProps, newProps) &&
    match("u17")
  );
}

function putMoveNameLenInJson(rawData, jsonData) {
  if (rawData.length !== jsonData.moves.length) return;
  for (let i = 0; i < rawData.length; i++) {
    const move = jsonData.moves[i];
    const raw = rawData[i];
    if (raw["NAME_KEY"] === move.name_key) {
      move.name_len = raw["NAME_LENGTH"];
    }
    if (raw["ANIM_KEY"] === move.anim_key) {
      move.anim_len = raw["ANIM_LENGTH"];
    }
    // console.log(i, hex(move.name_key), move.name_len, hex(move.anim_key), move.anim_len);
  }
}

function main() {
  const lengthData = parseFileSync("./experiment/raw.txt");
  const newData = require("./experiment/t8_KAZUYA.json");
  const oldData = require("./experiment/t7_KAZUYA.json");
  oldMoveset = oldData;
  newMoveset = newData;
  // console.log(lengthData.length === newData.moves.length);
  putMoveNameLenInJson(lengthData, newData);
  let oldIdx = 1833;
  let newIdx = 1920;
  for (let i = 0; i < 60; i++) {
    const newMove = newData.moves[newIdx];
    const oldMove = oldData.moves[oldIdx];
    const hexKey = hex(newMove.name_key, 8);
    if (newMove.name_key === 0x0a7d5169) {
      const name = "SE_DEAD_2";
      // console.log(`${name} ${hexKey} ${newIdx}`);
      console.log(`${name} ${hexKey}`);
      newIdx++;
      continue;
    } else {
      if (isSimilar(oldMove, newMove)) {
        // console.log(`[${oldIdx}] ${oldMove.name} ${oldMove.name.length} ${hexKey} ${newMove.name_len} [${newIdx}]`);
        console.log(`${oldMove.name} ${hexKey}`);
      }
      else {
        console.log(`BREAK AT [${oldIdx}] ${oldMove.name} - ${hexKey} [${newIdx}]`)
        break;
      }
      // console.log(`${oldMove.name} ${hexKey} ${newIdx}`);
    }
    newIdx++;
    oldIdx++;
  }
}

main();

// function parseFileSync(filePath) {
//   const data = fs.readFileSync(filePath, "utf8");
//   const lines = data.split("\n").filter((line) => line.trim().length > 0);
//   const mapping = {}
//   lines.forEach((line) => {
//     const [name, key] = line.trim().split(/\s+/);
//     const int = parseInt(key, 16)
//     if (!isNaN(int)) mapping[int] = name
//   });
//   return mapping
// }

// const mapping = parseFileSync("./experiment/name_keys.txt")
// console.log(JSON.stringify(mapping, null, 2))
