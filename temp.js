const fs = require("fs");
const { computeKamuiHash } = require("./hash");
const BinaryFileReader = require("./binaryFileReader");
const { readMovesList } = require("./utils");

const print = console.log;

const hex = (value, length = 2) =>
  "0x" + value.toString(16).padStart(length, "0");

// const readTxt = (path) => {
//   const buffer = fs.readFileSync(path, "utf-8");
//   return buffer.trim().split("/n").filter(Boolean);
// };

// const restoreNames = () => {
//   const folderPath = "";
//   const files = fs.readdirSync(folderPath).filter((x) => x.endsWith(".json"));
//   const nameKeys = require("./name_keys.json");
//   for (const file of files) {
//     const filePath = `${folderPath}/${file}`;
//     const json = fs.readFileSync(filePath, "utf8");
//     const moveset = JSON.parse(json, (_, v) => {
//       if (typeof v === "number" && !Number.isSafeInteger(v)) {
//         return BigInt(v);
//       }
//       return v;
//     });
//     print(moveset.tekken_character_name);
//     moveset.moves.forEach((move, i) => {
//       const nameKey = move.name_key;
//       const noName = "move_" + i;
//       if (move.name === noName && nameKeys[nameKey]) {
//         print(i, nameKeys[nameKey]);
//         move.name = nameKeys[nameKey];
//       }
//     });
//     fs.writeFileSync(
//       filePath,
//       JSON.stringify(
//         moveset,
//         (_, v) => (typeof v === "bigint" ? v.toString() : v),
//         2,
//       ),
//     );
//   }
// };

// const FILE = "crw";

// (() => {
//   // restoreNames();
//   // return;
//   const buffer = fs.readFileSync(`./Binary/mothead/bin/${FILE}.motbin`);
//   const reader = new BinaryFileReader(buffer.buffer);

//   const dict = require("./name_keys.json");

//   const moves = readMovesList(reader);

//   // This value will always be less than "count" as it's an index
//   const alias8000 = reader.readInt16(0x30);
//   const alias8001 = reader.readInt16(0x32);

//   // TODO: Take all the moves before alias8000
//   // Append "_story" at their end and generate their hash (e.g, hash.computeKamuiHash(name))
//   // See if we find a match for that hash after b/w alias8000 and the end of the movelist
//   const aliasMatches = [];
//   let flag = false;

//   for (let i = 0; i < moves.length; i++) {
//     const move = moves[i];
//     if (!move.name) continue;

//     let storyName;
//     // storyName = String(move.name).replace("Kz_", "Xxb_");
//     // storyName = "Esc_" + move.name;
//     storyName = "" + move.name + "3";
//     // storyName = "" + move.name + "_BIG";
//     // storyName = "" + move.name + "_NewDASH";
//     // storyName = "story_" + move.name;
//     // storyName = String(move.name).replace("_tw", "_2_tw");
//     // storyName = String(move.name).replace("3", "4");
//     const storyHash = Number(computeKamuiHash(storyName));

//     // if (move.name === "Kz_4rprp") {
//     //   print("~FOUND!");
//     //   print("Key:", hex(move.name_key));
//     //   print("Story Name:", storyName);
//     //   print("Story Key:", storyHash);
//     // }

//     // Look for matching name_key in the alias region
//     for (let j = 0; j < moves.length; j++) {
//       if (moves[j].name_key === storyHash && !dict[storyHash]) {
//         // if (moves[j].name_key === storyHash) {
//         flag = true;
//         dict[storyHash] = storyName;
//         aliasMatches.push({
//           base_index: i,
//           base_name: move.name,
//           story_name: storyName,
//           story_hash: hex(storyHash),
//           alias_index: j,
//           message: `"${storyHash}": "${storyName}",`,
//         });
//       }
//     }
//   }

//   // Print or use result
//   print("Found alias matches:", aliasMatches);

//   aliasMatches.forEach((alias) => {
//     print(alias.message);
//   });

//   // If new entry found, write to the dictionary
//   if (flag) {
//     fs.writeFileSync("./name_keys.json", JSON.stringify(dict, null, 2));
//   }
// })();

// // function readCharMoves(charCode) {
// //   const file = fs.readFileSync(`./Binary/mothead/bin/${charCode}.motbin`);
// //   const reader = new BinaryFileReader(file.buffer);
// //   const moves = readMovesList(reader);
// //   return moves;
// // }

// // (() => {
// //   const mvl1 = readCharMoves("bsn");
// //   const mvl2 = readCharMoves("xxd");
// //   const dict = require("./name_keys.json");
// //   let flag = false;

// //   for (let i = 0; i < mvl1.length; i++) {
// //     const move = mvl1[i];
// //     if (!move.name) continue;

// //     let storyName = "";
// //     storyName = move.name + "_tw";
// //     const storyHash = computeKamuiHash(storyName);

// //     for (let j = 0; j < mvl2.length; j++) {
// //       if (mvl2[j].name_key === storyHash && !dict[storyHash]) {
// //         flag = true;
// //         dict[storyHash] = storyName;
// //         print(`"${storyHash}": "${storyName}",`);
// //       }
// //     }
// //   }

// //   // If new entry found, write to the dictionary
// //   if (flag) {
// //     fs.writeFileSync("./name_keys.json", JSON.stringify(dict, null, 2));
// //   }
// // })();

// Script to restore some anim name keys

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

const tk_charId = (c) => ({
  value: (c.readInt32(0x160) - 1) / 0xffff,
  size: 4,
});

;(() => {
  const files = fs.readdirSync("./Binary/mothead/bin").filter((x) => x.endsWith(".motbin") && x !== "ja4.motbin");
  const nameKeys = require("./name_keys.json");

  for (const file of files) {
    const filePath = `./Binary/mothead/bin/${file}`;
    const code = file.replace(".motbin", "");
    if (code === "test") continue;
    const buffer = fs.readFileSync(filePath);
    const reader = new BinaryFileReader(buffer.buffer);
    const charId = reader.read(tk_charId);

    print("Processing", file, charId);

    const animNameKeysSet = new Set();
    const lengthDict = {};

    const moves = readMovesList(reader);

    moves.forEach((move) => {
      lengthDict[move.anim_name_key] = move.anim_name_length;
      animNameKeysSet.add(move.anim_name_key);
    });

    const addToDict = (input) => {
      const hash = computeKamuiHash(input);
      const length = lengthDict[hash];
      if (!nameKeys[hash] && animNameKeysSet.has(hash) && length === input.length) {
        print(input, hash);
        nameKeys[hash] = input;
      }
    };

    [0, 1, 2, 3, 4, 98, 99].forEach((i) => {
      const postfix = i.toString().padStart(2, "0");
      addToDict(code + "_sta_" + postfix);
      addToDict(code + "_win_" + postfix);
      addToDict(code + "_win_" + postfix + "_y");
    })

    for (const gen of generateSuffixes(SET_SMALL, 2)) {
      addToDict(code + gen + "_co_kamae");
      addToDict(code + gen + "_ra_pre");
      addToDict(code + gen + "_ra_finish_f");
      addToDict(code + gen + "_ra_finish_y");
      addToDict(code + gen + "_ra_finish_ko_f");
      addToDict(code + gen + "_ra_finish_ko_y");
      addToDict(code + gen + "_ra_pre_story");
      addToDict(code + gen + "_ra_finish_story_f");
      addToDict(code + gen + "_ra_finish_story_y");

      addToDict(code + gen + "_at_lp");
      addToDict(code + gen + "_at_rp");
      addToDict(code + gen + "_at_lk");
      addToDict(code + gen + "_at_rk");
      addToDict(code + gen + "_at_lk00");
      addToDict(code + gen + "_at_rk00");
      addToDict(code + gen + "_at_lp00");
      addToDict(code + gen + "_at_rp00");

      const inputs = ["lp", "rp", "lk", "rk", "wp", "wk"];
      const depth = 4;
      // Recursively generate all possible input combos of specified depth, using self, and store hashes.
      function generateAndStoreCombinations(prefix, combo = "", d = 0) {
        if (d === depth) {
          const animName = code + gen + "_at_" + combo;
          addToDict(animName);
          // Optionally, you could collect hashes in a Set/Array if desired
          return;
        }
        for (const input of inputs) {
          generateAndStoreCombinations(prefix, combo + input, d + 1);
        }
      }

      generateAndStoreCombinations(code + gen + "_at_");
    }
  }

  fs.writeFileSync("./name_keys.json", JSON.stringify(nameKeys, null, 2));
})();
