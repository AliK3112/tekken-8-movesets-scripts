const fs = require("fs");
const hash = require("./kamui-hash/build/Release/kamuihash.node");
const BinaryFileReader = require("./binaryFileReader");
const { readMovesList } = require("./utils");

const print = console.log;

const hex = (value, length = 2) =>
  "0x" + value.toString(16).padStart(length, "0");

const readTxt = (path) => {
  const buffer = fs.readFileSync(path, "utf-8");
  return buffer.trim().split("\n").filter(Boolean);
};

const restoreNames = () => {
  const folderPath = "/Users/qbatch/Downloads/t8_2_08_01";
  const files = fs.readdirSync(folderPath);
  const nameKeys = require("./name_keys.json");
  for (const file of files) {
    const filePath = `${folderPath}/${file}`;
    const moveset = require(filePath);
    print(moveset.tekken_character_name);
    moveset.moves.forEach((move, i) => {
      const nameKey = move.name_key;
      const noName = "move_" + i;
      if (move.name === noName && nameKeys[nameKey]) {
        print(i, nameKeys[nameKey]);
        move.name = nameKeys[nameKey];
      }
    });
    fs.writeFileSync(filePath, JSON.stringify(moveset, null, 2));
  }
};

const FILE = "zbr";

(() => {
  // restoreNames();
  // return;
  const buffer = fs.readFileSync(
    `./Binary_expanded/mothead/bin/${FILE}.motbin`,
  );
  const reader = new BinaryFileReader(buffer.buffer);

  const dict = require("./name_keys.json");

  const moves = readMovesList(reader);

  // This value will always be less than "count" as it's an index
  const alias8000 = reader.readInt16(0x30);
  const alias8001 = reader.readInt16(0x32);

  // TODO: Take all the moves before alias8000
  // Append "_story" at their end and generate their hash (e.g, hash.computeKamuiHash(name))
  // See if we find a match for that hash after b/w alias8000 and the end of the movelist
  const aliasMatches = [];
  let flag = false;

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    if (!move.name) continue;

    let storyName;
    // storyName = String(move.name).replace("Kz_", "Xxb_");
    // storyName = "" + move.name + "_cancel";
    // storyName = "" + move.name + "_cancel";
    // storyName = "" + move.name + "_miss";
    storyName = "" + move.name + "_sentai";
    // storyName = "story_" + move.name;
    // storyName = String(move.name).replace("Jz_", "Act15_");
    // storyName = String(move.name).replace("3", "4");
    const storyHash = Number(hash.computeKamuiHash(storyName));

    // if (move.name === "Kz_4rprp") {
    //   print("~FOUND!");
    //   print("Key:", hex(move.name_key));
    //   print("Story Name:", storyName);
    //   print("Story Key:", storyHash);
    // }

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
