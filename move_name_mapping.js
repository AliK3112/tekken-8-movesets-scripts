const fs = require("fs");
// const { hex } = require("./utils");

// function parseFileSync(filePath) {
//   try {
//     // Read the file synchronously
//     const data = fs.readFileSync(filePath, "utf8");

//     // Split the file content by newlines and filter out empty lines
//     const lines = data.split("\n").filter((line) => line.trim().length > 0);

//     // Assume the first line is the header
//     const headers = lines[0].trim().split(/\s+/);
//     headers.shift(); // removing "INDEX" column

//     // Process each subsequent line to convert it into an object
//     const parsedData = lines.slice(1).map((line) => {
//       const values = line.trim().split(/\s+/);
//       values.shift(); // removing "INDEX" column

//       const entry = {};

//       headers.forEach((header, index) => {
//         entry[header] = +values[index];
//       });

//       return entry;
//     });

//     return parsedData;
//   } catch (err) {
//     console.error("Error reading or parsing file:", err);
//     throw err;
//   }
// }

// function putMoveNameLenInJson(rawData, jsonData) {
//   if (rawData.length !== jsonData.moves.length) return;
//   for (let i = 0; i < rawData.length; i++) {
//     const move = jsonData.moves[i];
//     const raw = rawData[i];
//     if (raw["NAME_KEY"] === move.name_key) {
//       move.name_len = raw["NAME_LENGTH"];
//     }
//     if (raw["ANIM_KEY"] === move.anim_key) {
//       move.anim_len = raw["ANIM_LENGTH"];
//     }
//     console.log(i, hex(move.name_key), move.name_len, hex(move.anim_key), move.anim_len);
//   }
// }

// function main() {
//   const lengthData = parseFileSync("./experiment/raw.txt");
//   const newData = require("./experiment/t8_KAZUYA.json");
//   const oldData = require("./experiment/t7_KAZUYA.json");
//   // console.log(lengthData.length === newData.moves.length);
//   putMoveNameLenInJson(lengthData, newData);
//   // let oldIdx = 1483;
//   // let newIdx = 1513;
//   // for (let i = 0; i < 67; i++) {
//   //   const newMove = newData.moves[newIdx];
//   //   const oldMove = oldData.moves[oldIdx];
//   //   if (newMove.name_key === 0x0a7d5169) {
//   //     const name = "SE_DEAD_2";
//   //     // console.log(`${name} ${hex(newMove.name_key, 8)} ${newIdx}`);
//   //     console.log(`${name} ${hex(newMove.name_key, 8)}`);
//   //     newIdx++;
//   //     continue;
//   //   } else {
//   //     console.log(`${oldMove.name} ${hex(newMove.name_key, 8)}`);
//   //     // console.log(`${oldMove.name} ${hex(newMove.name_key, 8)} ${newIdx}`);
//   //   }
//   //   newIdx++;
//   //   oldIdx++;
//   // }
// }

// main();

function parseFileSync(filePath) {
  const data = fs.readFileSync(filePath, "utf8");
  const lines = data.split("\n").filter((line) => line.trim().length > 0);
  const mapping = {}
  lines.forEach((line) => {
    const [name, key] = line.trim().split(/\s+/);
    const int = parseInt(key, 16)
    if (!isNaN(int)) mapping[int] = name
  });
  return mapping
}

const mapping = parseFileSync("./experiment/name_keys.txt")
console.log(JSON.stringify(mapping, null, 2))
