const fs = require("fs");
const Hash = require("./hash");
const BinaryFileReader = require("./binaryFileReader");
const { readMovesList, hex } = require("./utils");

const FILE = "xxf";
const PREFIX = "Xf_";
const POSTFIX = "";
const DEPTH = 2;
const PATH = `./Binary/mothead/bin/${FILE}.motbin`;
const DICT_PATH = "./name_keys.json";
const DICT = require(DICT_PATH);
const MOVES_DICT = {};
const NAME_KEY_SET = new Set();

const print = console.log;
const hash = (value) => hex(Hash.computeKamuiHash(value));

const readBin = () => {
  const buffer = fs.readFileSync(PATH);
  const reader = new BinaryFileReader(buffer.buffer);
  return readMovesList(reader);
};

const addToDict = (string, hashedValue, foundMove) => {
  if (
    foundMove &&
    !DICT[+hashedValue] &&
    foundMove?.name_length === string.length
  ) {
    DICT[hashedValue] = string;
    print(string, hex(hashedValue));
  }
};

/**
 * @param {any[]} moves
 */
function generateThrowNames(moves) {
  const strings = [
    "FLnage",
    "FRnage",
    "Lnage",
    "Rnage",
    "Bnage",
    "FCnage",
    "nagef",
    "nageL",
    "nageR",
    "LSide",
    "RSide",
    "9wp",
    "9WP",
  ];
  for (const string of strings) {
    const n = PREFIX + string + "_n";
    const y = PREFIX + string + "_y";
    const Escn = "Esc_" + n;
    const Escy = "Esc_" + y;

    const values = [n, y, Escn, Escy];
    for (const value of values) {
      const hashed = Number(Hash.computeKamuiHash(value));
      const found = moves.find((move) => move.name_key === hashed);
      addToDict(value, hashed, found);
    }
  }
}

/**
 * @param {any[]} moves
 */
function generateMovements(moves) {
  const strings = [
    "sFUN00_",
    "sFUN01_",
    "sKAM00_",
    "sKAM01_",
    "sWALKF",
    "sWALKFLp",
    "sDASHF",
    "sDASHFLp",
    "sWALKB",
    "sWALKBLp",
    "sWALKBMv",
    "sDASHB",
    "sSTEPB",
    "cKAM00_",
    "cKAM01_ ",
    "cWALKF",
    "cWALKFLp",
    "cWALKB",
    "sJUMP_",
    "st2cr00_",
    "st2cr00F",
    "st2cr_Rv",
    "st2crFRv",
    "st2cr01B",
    "st2crBRv",
    "Direct",
    "KAM",
    "SUPER_0",
    "lp00",
    "lp00mis",
    "jplk00",
    "jprk00",
    "jprk00F",
    "sjprk01F",
    "sjprk02F",
    "sjprk03F",
    "rpF",
    "lpF",
    "rkF",
    "lkF",
    "rpB",
    "lpB",
    "rkB",
    "lkB",
    "lp00B",
    "lp00F",
    "lp00Fmis",
    "rp00",
    "rp00F",
    "rp00B",
    "lrp00",
    "lrp00F",
    "lrp00B",
    "lrp00G",
    "lrp00H",
    "lk00",
    "lk00F",
    "lk00H",
    "lk00G",
    "lk00B",
    "rk00",
    "rk00F",
    "rk00B",
    "WP",
    "WK",
    "wp",
    "wk",
    "WPF",
    "WKF",
    "wpF",
    "wkF",
    "WPB",
    "WKB",
    "wpB",
    "wkB",
    "syalp",
    "syalpF",
    "syalp00",
    "syarp",
    "syarpF",
    "syarp00",
    "syalk",
    "syalkF",
    "syalk00",
    "syark",
    "syarkF",
    "syark00",
  ];
  for (const string of strings) {
    const value = PREFIX + string;
    const hashed = Number(Hash.computeKamuiHash(value));
    if (NAME_KEY_SET.has(hashed)) {
      addToDict(value, hashed, MOVES_DICT[hashed]);
    }
  }
}

/**
 * @param {any[]} moves
 */
function generateHeatAndRageMoves(moves) {
  const strings = [
    "ZoneBurst00",
    "ZoneBurst00_story",
    "ZoneBurst00_Story",
    "ZoneBurst01",
    "ZoneBurst00_Ground",
    "ZoneD",
    "ZoneD_n",
    "ZoneD_y",
    "ZoneDrive",
    "ZoneDrive0",
    "ZoneDrive_n",
    "ZoneDrive_y",
    "HeatSmash",
    "HeatSmash_n",
    "HeatSmash_y",
    "RageArts00",
    "RageArts01",
    "RageArts02",
    "RageArts_n",
    "RageArts_y",
    "RageArts_KO_n",
    "RageArts_KO_y",
  ];
  for (const string of strings) {
    const value = PREFIX + string;
    const hashed = Number(Hash.computeKamuiHash(value));
    if (NAME_KEY_SET.has(hashed)) {
      addToDict(value, hashed, MOVES_DICT[hashed]);
    }
  }
}

/**
 * @param {any[]} moves
 * @param {string} prefix
 */
function generateCodeNameStrings(moves, prefix = PREFIX) {
  const strings = Array(10)
    .fill(0)
    .map((_, i) => i.toString().padStart(2, "0"));
  for (const string of strings) {
    const value = (prefix + "rs" + string).toLowerCase();
    const hashed = Number(Hash.computeKamuiHash(value));
    const found = moves.find((move) => move.name_key === hashed);
    addToDict(value, hashed, found);
  }
  // Customization Poses
  ["CUS_KAM", "CUS_TPOSE"].forEach((code) => {
    const value = prefix + code;
    const hashed = Number(Hash.computeKamuiHash(value));
    if (NAME_KEY_SET.has(hashed)) {
      addToDict(value, hashed, MOVES_DICT[hashed]);
    }
  });
}

function trySuffixVariants(baseStrings) {
  const suffixes = [
    "2",
    "3",
    "4",
    "_2",
    "_3",
    "_4",
    "_EX",
    "_EX2",
    "_EX3",
    "EX",
    "EX2",
    "_Lv2",
    "_Lv3",
  ];
  for (const base of baseStrings) {
    for (const suffix of suffixes) {
      const value = base + suffix;
      const hashed = Number(Hash.computeKamuiHash(value));
      if (NAME_KEY_SET.has(hashed)) {
        addToDict(value, hashed, MOVES_DICT[hashed]);
      }
    }
  }
}

(() => {
  // const hashes = readBin().filter(hash => [5, 6].includes(hash.name_length));
  const moves = readBin();

  // Create a Set of the name_keys from the hashes for O(1) lookups
  // Setting it up globally
  NAME_KEY_SET.clear();
  for (const move of moves) {
    MOVES_DICT[move.name_key] = move;
    NAME_KEY_SET.add(move.name_key);
  }

  generateThrowNames(moves);
  generateMovements(moves);
  generateHeatAndRageMoves(moves);
  generateCodeNameStrings(moves, FILE + "_");

  // Define the directions and inputs as before
  const directions = [1, 2, 3, 4, 6, 7, 8, 9, 66, 44, 666, 623, 412]
    .map((x) => x.toString())
    .concat("");
  let inputs = ["LP", "RP", "LK", "RK", "WP", "WK", "s", ""];
  // inputs = inputs.map((x) => x.toLowerCase());
  const prefix = PREFIX;
  const postfix = POSTFIX;

  // Set the depth of input repetition (1 to 3)
  const depth = DEPTH;

  // Precompute the hashes for each direction-input combination based on the depth
  const hashCombinations = directions.flatMap((direction) => {
    const base = prefix + direction;

    // Recursive input generation
    const generateCombinations = (currentDepth, current) => {
      if (currentDepth === depth) {
        return [current];
      }
      return inputs.flatMap(
        (input) => generateCombinations(currentDepth + 1, current + input),
        // generateCombinations(
        //   currentDepth + 1,
        //   current && input ? `${current}_${input}` : current + input,
        // ),
      );
    };

    // Generate the input-based strings, then append postfix afterward
    return generateCombinations(0, base).map((str) => {
      const full = str + postfix;
      return { string: full, hashed: hash(full) };
    });
  });

  const discoveredStrings = [];
  // Iterate through precomputed hashes and check against "NAME_KEY_SET" for O(1) lookup
  hashCombinations.forEach(({ string, hashed }) => {
    if (NAME_KEY_SET.has(+hashed)) {
      // Checking if the length matches the target string
      if (!DICT[+hashed] && MOVES_DICT[+hashed].name_length === string.length) {
        DICT[+hashed] = string;
        print(string, hashed);
        discoveredStrings.push(string);
      }
    }
  });

  trySuffixVariants(discoveredStrings);

  // Save the updated DICT back to the file
  fs.writeFileSync(DICT_PATH, JSON.stringify(DICT, null, 2));
  print("Saved Dict!");
})();
