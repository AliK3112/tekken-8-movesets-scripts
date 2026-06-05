const fs = require("fs");
const BinaryFileReader = require("./binaryFileReader");
const { computeKamuiHash } = require("./hash");
const { readMovesList } = require("./utils");

const PARENT_DIR = "./Binary/mothead/bin";
const TYPES = ["at", "gd", "dm", "it", "ra", "co", "un", "th"];
const DEV_SUFFIXES = ["am", "az", "cb", "co", "dz", "et", "gs", "ha", "hg", "hi", "hk", "hr", "ik", "in", "is", "kb", "kc", "ke", "kj", "km", "ko", "kt", "kw", "kz", "mb", "mo", "ms", "mx", "na", "nb", "nk", "no", "nt", "od", "ok", "oz", "sa", "sj", "sk", "ss", "su", "ta", "tb", "tg", "to", "ya", "yg", "yk", "yo", "yt"];
const NAME_KEYS = require("./name_keys.json");
const CHARCODE = "pja";
const OLDCODE = "pj";
const print = console.log;
const hex = (x) => ("0x" + x.toString(16).padStart(8, "0"));

function main() {
  const files = fs.readdirSync(PARENT_DIR).filter((file) => file.endsWith(".motbin") && file !== "ja4.motbin");


  const t7AnimNames = require("./anim_names.json");
  // const moveset = require("./tag2_JUN_KAZAMA.json");
  // const t7AnimNames = moveset.moves.reduce((acc, move) => {
  //   const aName = move.anim_name.replace("(DVD)", "").trim();
  //   acc[aName] ??= [];
  //   if (!acc[aName].includes(move.name)) {
  //     acc[aName].push(move.name);
  //   }
  //   return acc;
  // }, {});

  let counter = 0;

  for (const file of files) {
    // if (!file.includes(CHARCODE)) continue;

    print(`Processing file: ${file}`);

    const filePath = `${PARENT_DIR}/${file}`;
    const reader = BinaryFileReader.open(filePath);

    const moves = readMovesList(reader);
    const animNameLenDict = moves.reduce((acc, move) => {
      acc[move.anim_name_key] = move.anim_name_length;
      return acc;
    }, {});

    const oldAnimNames = Object.keys(t7AnimNames);

    const charCode = CHARCODE;
    // const charCode = "wan";
    const oldCode = OLDCODE;

    const func = (input, suffix, animName) => {
      if (!input) return false;
      for (const type of TYPES) {
        const newAnimName = input + "_" + type + "_" + suffix.join("_");
        const hash = computeKamuiHash(newAnimName);
        const len = animNameLenDict[hash];
        if (len === newAnimName.length && !NAME_KEYS[hash]) {
          counter++;
          NAME_KEYS[hash] = newAnimName;
          print(
            `Found match for ${animName} -> ${newAnimName} (hash: ${hex(hash)})`
          );
          return true;
        }
      }
      return false;
    };

    for (const animName of oldAnimNames) {
      const [prefix, ...suffix] = animName.split("_");
      let input = "";
      if (prefix.startsWith(oldCode)) {
        const found = func(prefix.replace(oldCode, charCode), suffix, animName);
        if (!found) {
          for (const devSuffix of DEV_SUFFIXES) {
            // anss_jkam2lk -> kgrkb_at_jkam2lk (different dev suffix)
            func(charCode + devSuffix, suffix, animName);
          }
        }

      } else if (prefix.endsWith(oldCode)) {
        // E.g, "kohe_fer2genko" -> beeko_at_fer2genko
        // In this case, "he" will become "bee" but it needs to be placed in the beginning
        let found = false;
        found = func(charCode + prefix.replace(oldCode, ""), suffix, animName);
        if (!found) {
          for (const devSuffix of DEV_SUFFIXES) {
            // anss_jkam2lk
            func(charCode + devSuffix, suffix, animName);
          }
        }

        // E.g, "ozjn_shin_f" -> "jnob_at_shin_f"
        found = func(oldCode + prefix.replace(oldCode, ""), suffix, animName);
        if (!found) {
          for (const devSuffix of DEV_SUFFIXES) {
            // anss_jkam2lk
            func(oldCode + devSuffix, suffix, animName);
          }
        }
      }
    }

    reader.close();
  }

  print(`Total matches: ${counter}\n`);
  if (counter > 0) {
    fs.writeFileSync("./name_keys.json", JSON.stringify(NAME_KEYS, null, 2));
  }
}

main();
