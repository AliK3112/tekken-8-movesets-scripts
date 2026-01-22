const fs = require("fs");
var Hash = require("./kamui-hash/build/Release/kamuihash.node");

function loadNameKeys() {
  try {
    return require("./name_keys.json");
  } catch {
    return {};
  }
}

// 0 = useCandidatesToDeduce
// 1 = useBaseAndCandidatesToDeduce
// 2 = useBaseToDeduce
const MODE = 0;
const BASE = "sDm_munetuki";
const SUFFIX_LENGTH = 2;
const NAME_KEYS = loadNameKeys();

const print = console.log;
var hex = (x) => "0x" + x.toString(16);
var hash = (value) => hex(Hash.computeKamuiHash(value));
var array = [];
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_";
// const chars = "0123456789";

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

const printDramaNames = () => {
  // Example: length of suffix is configurable
  const base = "sDm_tuki_hi";

  const codes = [
    "aml",
    "ant",
    "bbn",
    "bee",
    "bsn",
    "cat",
    "cbr",
    "ccn",
    "cht",
    "cml",
    "crw",
    "ctr",
    "der",
    "dog",
    "ghp",
    "got",
    "grf",
    "grl",
    "hms",
    "hrs",
    "ja4",
    "jly",
    "kal",
    "kgr",
    "klw",
    "kmd",
    "knk",
    "lon",
    "lzd",
    "mnt",
    "okm",
    "pgn",
    "pig",
    "rat",
    "rbt",
    "snk",
    "swl",
    "test",
    "tgr",
    "ttr",
    "wkz",
    "wlf",
    "xxa",
    "xxb",
    "xxc",
    "xxd",
    "xxe",
    "xxf",
    "xxg",
    "zbr",
  ];
  const vclips = require("./vclips.json");

  const printOrNot = (value, string) => {
    if (vclips[+value] && !NAME_KEYS[+value]) {
      print(`"${+value}": "${string}",`);
      NAME_KEYS[+value] = string;
    }
  };

  // for (const code of codes) {
  //   const input = code + "_CUS_TPOSE";
  //   const value = hash(input);
  //   if (!NAME_KEYS[+value]) {
  //     NAME_KEYS[+value] = input;
  //     print(`"${+value}": "${input}",`);
  //   }
  // }
  // fs.writeFileSync("./name_keys.json", JSON.stringify(NAME_KEYS, null, 2));
  // return;

  for (const code1 of codes) {
    for (const code2 of codes) {
      for (let i of [0, 10, 20]) {
        for (const suffix of generateSuffixes(chars, SUFFIX_LENGTH)) {
          let input, hashed;
          input = `fate_${code1}_${code1}vs${code2}_${suffix}`;
          hashed = hash(input);
          printOrNot(hashed, input);

          input = `fate_${code2}_${code1}vs${code2}_${suffix}`;
          hashed = hash(input);
          printOrNot(hashed, input);
        }
      }
    }
  }

  fs.writeFileSync("./name_keys.json", JSON.stringify(nameKeys, null, 2));
  return;

  for (const code of codes) {
    for (const i of [0, 1, 2, 3]) {
      const intro = `${code}_s0${i}`;
      const outro = `${code}_w0${i}`;
      const introHash = hash(intro);
      const outroHash = hash(outro);
      printOrNot(introHash, intro);
      printOrNot(outroHash, outro);

      // Generating variants
      let found = false;
      for (const suffix of generateSuffixes(chars, SUFFIX_LENGTH)) {
        let input, hashed;
        input = intro + "_st" + suffix;
        hashed = hash(input);
        printOrNot(hashed, input);

        input = outro + "_st" + suffix;
        hashed = hash(input);
        printOrNot(hashed, input);
        // if (target.includes(+hashed) && !nameKeys[+hashed]) {
        //   print(`"${+hashed}": "${input}",`);
        //   found = true;
        // }
      }
    }
  }
  return;
};

const readTextFile = (path) => {
  const lines = fs
    .readFileSync(path, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((x) => x.replace("\r", ""));
  return lines;
};

function useCandidatesToDeduce(target) {
  let found = false;
  // const array = require("/Users/qbatch/Downloads/0x8fec784e.json");
  const array = readTextFile("0x7a562929_.txt");
  for (const candidate of array) {
    // console.log("Checking %s", candidate);
    // for (const suffix of generateSuffixes(chars, SUFFIX_LENGTH)) {
    //   let input = candidate + suffix;
    //   // input = input.replace("sDm_", "aDw_");
    //   const hashed = hash(input);
    //   if (target.includes(+hashed) && !NAME_KEYS[+hashed]) {
    //     print(`"${+hashed}": "${input}",`);
    //     found = true;
    //     return true;
    //   }
    // }
    let input = candidate;
    if (input.endsWith("_L")) {
      input = input.replace("_L", "_R");
    } else if (input.endsWith("_R")) {
      input = input.replace("_R", "_L");
    }
    // let input = candidate + "_story";
    // input = input.replace("_n", "_y");
    // input = input.replace("grl_", "got_");
    // console.log("Checking %s", input);
    const hashed = hash(input);
    if (target.includes(+hashed) && !NAME_KEYS[+hashed]) {
      print(`"${+hashed}": "${input}",`);
      found = true;
      break;
    }
  }
  return found;
}

function useBaseAndCandidatesToDeduce(base, target) {
  let found = false;
  for (const candidate of array) {
    const input = base + candidate;
    const hashed = hash(input);
    // print(`Checking ${input} -> ${hashed}`);
    // if (target.includes(+hashed) && !NAME_KEYS[+hashed]) {
    if (target.includes(+hashed)) {
      print(`"${+hashed}": "${input}",`);
      found = true;
    }
  }
  return found;
}

function useBaseToDeduce(base, target) {
  let found = false;
  for (const suffix of generateSuffixes(chars, SUFFIX_LENGTH)) {
    // const input = base + suffix;
    const input = base + suffix + "_DMGRATE";
    const hashed = hash(input);
    if (target.includes(+hashed) && !NAME_KEYS[+hashed]) {
      // if (target.includes(+hashed)) {
      print(`"${+hashed}": "${input}",`);
      found = true;
    }
  }
  return found;
}

(() => {
  // printDramaNames();
  // return;

  const target = [0x14ba737d];

  let found = false;
  switch (MODE) {
    case 0:
      found = useCandidatesToDeduce(target);
      break;
    case 1:
      found = useBaseAndCandidatesToDeduce(BASE, target);
      break;
    case 2:
      found = useBaseToDeduce(BASE, target);
      break;
    default:
      break;
  }

  if (!found) print("Found Nothing!");
})();
