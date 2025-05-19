const {
  getAllFiles,
  sortByGameId,
  toSignedInt32,
  hex,
  print,
  getCharacterName,
} = require("./utils");

let MOVESET = {};
let LOG = true;

function getThrowExtradata(index) {
  const arr = [];
  while (true) {
    const row = MOVESET.throw_extras[index++];
    arr.push(row);
    if (row.u2.every((x) => x === 0)) {
      break;
    }
  }
  return arr;
}

function listThrowsData() {
  // u1, throwextra_idx
  MOVESET.throws.forEach((throwData, i) => {
    const extradata = getThrowExtradata(throwData.throwextra_idx)
    print(`--- Index ${i} - u1 ${throwData.u1} ---`)
    for (const data of extradata) {
      print(data.u1, " - ", data.u2.map(x => hex(x, 4)).join(" "))
    }
  });
}

function main() {
  sortByGameId(getAllFiles()).forEach((path) => {
    const moveset = require(`./${path}`);
    if (LOG) {
      print(moveset.tekken_character_name, "-", moveset.character_id);
    }
    MOVESET = moveset;
    // if (moveset.character_id === 8) listThrowsData();
    listThrowsData();
  });
}

main();
