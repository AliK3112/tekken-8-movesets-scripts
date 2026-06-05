const fs = require("fs");
const BinaryFileReader = require("./binaryFileReader");
const { computeKamuiHash } = require("./hash");
const { readMovesList } = require("./utils");

const PARENT_DIR = "./Binary/mothead/bin";

const TYPES = ["at", "gd", "dm", "it", "ra", "co", "un", "th"];

const DEV_SUFFIXES = [
  "am", "az", "cb", "co", "dz", "et", "gs", "ha", "hg", "hi",
  "hk", "hr", "ik", "in", "is", "kb", "kc", "ke", "kj", "km",
  "ko", "kt", "kw", "kz", "mb", "mo", "ms", "mx", "na", "nb",
  "nk", "no", "nt", "od", "ok", "oz", "sa", "sj", "sk", "ss",
  "su", "ta", "tb", "tg", "to", "ya", "yg", "yk", "yo", "yt"
];

const NAME_KEYS = require("./name_keys.json");

const CHARCODE = "bsn";
const OLDCODE = "bx";

const print = console.log;
const hex = (x) => "0x" + x.toString(16).padStart(8, "0");

const TYPE_PREFIXES = TYPES.map(type => `_${type}_`);

const CHAR_PREFIXES = DEV_SUFFIXES.map(x => CHARCODE + x);
const OLD_PREFIXES = DEV_SUFFIXES.map(x => OLDCODE + x);

const KNOWN_HASHES = new Set(
  Object.keys(NAME_KEYS).map(Number)
);

function main() {
  const files = fs
    .readdirSync(PARENT_DIR)
    .filter(
      file =>
        file.endsWith(".motbin") &&
        file !== "ja4.motbin"
    );

  const t7AnimNames = require("./anim_names.json");

  const oldAnimNames = Object.keys(t7AnimNames);

  let counter = 0;

  for (const file of files) {
    print(`Processing file: ${file}`);

    const filePath = `${PARENT_DIR}/${file}`;
    const reader = BinaryFileReader.open(filePath);

    const moves = readMovesList(reader);

    const animNameLenDict = Object.create(null);
    const validHashes = new Set();

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];

      animNameLenDict[move.anim_name_key] =
        move.anim_name_length;

      validHashes.add(move.anim_name_key);
    }

    const tryCandidate = (input, suffixStr, originalAnimName) => {
      if (!input) return false;

      for (let i = 0; i < TYPE_PREFIXES.length; i++) {
        const newAnimName =
          input +
          TYPE_PREFIXES[i] +
          suffixStr;

        const hash = computeKamuiHash(newAnimName);

        if (!validHashes.has(hash))
          continue;

        if (KNOWN_HASHES.has(hash))
          continue;

        const len = animNameLenDict[hash];

        if (len !== newAnimName.length)
          continue;

        KNOWN_HASHES.add(hash);
        NAME_KEYS[hash] = newAnimName;

        counter++;

        print(
          `Found match for ${originalAnimName} -> ${newAnimName} (hash: ${hex(hash)})`
        );

        return true;
      }

      return false;
    };

    for (const animName of oldAnimNames) {
      const parts = animName.split("_");

      const prefix = parts[0];
      const suffixStr = parts.slice(1).join("_");

      if (prefix.startsWith(OLDCODE)) {
        const candidates = [
          prefix.replace(OLDCODE, CHARCODE),
          ...CHAR_PREFIXES
        ];

        for (let i = 0; i < candidates.length; i++) {
          if (
            tryCandidate(
              candidates[i],
              suffixStr,
              animName
            )
          ) {
            break;
          }
        }
      }

      else if (prefix.endsWith(OLDCODE)) {
        const base1 =
          CHARCODE +
          prefix.replace(OLDCODE, "");

        const base2 =
          OLDCODE +
          prefix.replace(OLDCODE, "");

        const candidates = [
          base1,
          ...CHAR_PREFIXES,
          base2,
          ...OLD_PREFIXES
        ];

        for (let i = 0; i < candidates.length; i++) {
          if (
            tryCandidate(
              candidates[i],
              suffixStr,
              animName
            )
          ) {
            break;
          }
        }
      }
    }

    reader.close();
  }

  print(`Total matches: ${counter}\n`);

  if (counter > 0) {
    fs.writeFileSync(
      "./name_keys.json",
      JSON.stringify(NAME_KEYS, null, 2)
    );
  }
}

main();