const fs = require("fs");
const BinaryFileReader = require("./binaryFileReader");
const { computeKamuiHash } = require("./hash");
const { readMovesList } = require("./utils");

const PARENT_DIR = "./Binary/mothead/bin";
const TYPES = ["at", "gd", "dm", "it", "ra", "co", "un", "th"];
const NAME_KEYS = require("./name_keys.json");
const CHARCODE = "xxa";
const OLDCODE = "jz";
const print = console.log;
const hex = (x) => ("0x" + x.toString(16).padStart(8, "0"));

function main() {
  const files = fs.readdirSync(PARENT_DIR).filter((file) => file.endsWith(".motbin") && file !== "ja4.motbin");


  const t7AnimNames = require("./anim_names.json");

  let counter = 0;

  for (const file of files) {
    if (!file.includes(CHARCODE)) continue;

    print(`Processing file: ${file}`);

    const filePath = `${PARENT_DIR}/${file}`;
    const reader = BinaryFileReader.open(filePath);

    const moves = readMovesList(reader);

    const oldAnimNames = Object.keys(t7AnimNames);

    const charCode = CHARCODE;
    const oldCode = OLDCODE;

    for (const animName of oldAnimNames) {
      const [prefix, ...suffix] = animName.split("_");
      let input = "";
      if (prefix.startsWith(oldCode)) {
        input = prefix.replace(oldCode, charCode);
      } else if (prefix.endsWith(oldCode)) {
        // E.g, "kohe_fer2genko"
        // In this case, "he" will become "bee" but it needs to be placed in the beginning
        input = charCode + prefix.replace(oldCode, "");
      }

      // Only proceed if the input exists
      if (input) {
        for (const type of TYPES) {
          const newAnimName = input + "_" + type + "_" + suffix.join("_");
          const hash = computeKamuiHash(newAnimName);

          const move = moves.find((move) => move.anim_name_key === hash);

          if (move && move.anim_name_length === newAnimName.length && !NAME_KEYS[hash]) {
            counter++;
            NAME_KEYS[hash] = newAnimName;
            print(
              `Found match for ${animName} -> ${newAnimName} (hash: ${hex(hash)})`
            );
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
