const fs = require("fs");
const { computeKamuiHash } = require("./hash");
const BinaryFileReader = require("./binaryFileReader");
const { readMovesList } = require("./utils");

const print = console.log;

const hex = (value, length = 2) =>
  "0x" + value.toString(16).padStart(length, "0");

const FILE = "ker";

(() => {
  // restoreNames();
  // return;
  const buffer = fs.readFileSync(`./Binary/mothead/bin/${FILE}.motbin`);
  const reader = new BinaryFileReader(buffer.buffer);

  const dict = require("./name_keys.json");

  const moves = readMovesList(reader);

  // This value will always be less than "count" as it's an index
  const alias8000 = reader.readInt16(0x30);
  const alias8001 = reader.readInt16(0x32);

  const aliasMatches = [];
  let flag = false;

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    if (!move.name) continue;

    const prefixes = ["_hit", "_wall", "_armor", "2nd", "3rd", "_n", "_y", "_Turn", "_put", "_guard", "_Back", "_end", "_shoryu"];

    for (const prefix of prefixes) {
      let storyName;
      storyName = move.name + prefix;
      const storyHash = Number(computeKamuiHash(storyName));

      // Look for matching name_key in the alias region
      for (let j = 0; j < moves.length; j++) {
        if (moves[j].name_key === storyHash && !dict[storyHash]) {
          // if (moves[j].name_key === storyHash) {
          flag = true;
          dict[storyHash] = storyName;
          aliasMatches.push({
            base_index: i,
            base_name: move.name,
            story_name: storyName,
            story_hash: hex(storyHash),
            alias_index: j,
            message: `"${storyHash}": "${storyName}",`,
          });
        }
      }
    }
  }

  // Print or use result
  print("Found alias matches:", aliasMatches);

  aliasMatches.forEach((alias) => {
    print(alias.message);
  });

  // If new entry found, write to the dictionary
  if (flag) {
    fs.writeFileSync("./name_keys.json", JSON.stringify(dict, null, 2));
  }
})();
