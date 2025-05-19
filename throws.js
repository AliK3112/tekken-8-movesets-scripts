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
    let rows = []
    for (const data of extradata) {
      rows.push(`(${[data.u1, data.u2.map(x => hex(x, 4)).join(" ")].join(" ")})`)
    }
    print(`${String(i).padStart(3, " ")}: (${throwData.u1}) - ${rows.join(" > ")}`)
  });
}

function main() {
  sortByGameId(getAllFiles()).forEach((path) => {
    const moveset = require(`./${path}`);
    if (LOG) {
      print(moveset.tekken_character_name, "-", moveset.character_id);
    }
    MOVESET = moveset;
    // if (moveset.character_id === 0) listThrowsData();
    listThrowsData();
  });
}

main();
