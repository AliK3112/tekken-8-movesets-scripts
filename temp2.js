const fs = require("fs");
const { computeKamuiHash } = require("./hash");
const BinaryFileReader = require("./binaryFileReader");
const { readMovesList } = require("./utils");

const print = console.log;

const hex = (value, length = 2) =>
  "0x" + value.toString(16).padStart(length, "0");


const SET_SMALL = "abcdefghijklmnopqrstuvwxyz";

// Helper to generate all combinations of a given length from chars
function* generateSuffixes(chars, length, prefix = "") {
  if (length === 0) {
    yield prefix;
    return;
  }
  for (const c of chars) {
    yield* generateSuffixes(chars, length - 1, prefix + c);
  }
}

// na, oz, km, am, ss, ko, sk, ms, kz, ya, nk, yt, to, co

function main() {
  const t7keys = require("./anim_names.json");
  const nameKeys = require("./name_keys.json");
  const selectKeys = {};
  const developerPrefix = "oz";
  const pattern = `^${developerPrefix}[a-z]{2}_`;
  const regex = new RegExp(pattern);
  Object.entries(t7keys).forEach(([key, names]) => {
    if (regex.test(key)) {
      // const fkeys = names.filter(name => name.startsWith("Co_Dummy_"));
      const fkeys = names;
      if (fkeys.length > 0) {
        // selectKeys[key] = fkeys;
        fkeys.forEach(name => {
          selectKeys[name] = key;
        })
      }
    }
  });

  const t8file = fs.readFileSync("./Binary/mothead/bin/ant.motbin");
  const reader = new BinaryFileReader(t8file.buffer);
  const movelist = readMovesList(reader);
  reader.close();

  let foundCount = 0;

  const addToDict = (input, move) => {
    const hash = computeKamuiHash(input);
    if (!nameKeys[hash] && move.anim_name_key === hash && move.anim_name_length === input.length) {
      print(input, hex(hash));
      nameKeys[hash] = input;
      foundCount++;
    }
  };

  for (const move of movelist) {
    const animName = selectKeys[move.name];
    if (!animName) continue;
    for (const gen of generateSuffixes(SET_SMALL, 3)) {
      const suffix = animName.replace(regex, "");
      addToDict(`${gen}${developerPrefix}_dm_${suffix}`, move);
      addToDict(`${gen}${developerPrefix}_un_${suffix}`, move);
      addToDict(`${gen}${developerPrefix}_th_${suffix}`, move);
      addToDict(`${gen}${developerPrefix}_gd_${suffix}`, move);
    }
  }

  print("Found count:", foundCount);
  if (foundCount > 0) {
    fs.writeFileSync("./name_keys.json", JSON.stringify(nameKeys, null, 2));
  }
}

main();
