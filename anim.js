// Prints all the common animation keys

const fs = require("fs");
const BinaryFileReader = require("./binaryFileReader");

// const hex = (x, length = 8) => "0x" + x.toString(16).padStart(length, "0");
const hex = (x, length = 8) => x.toString(16).padStart(length, "0");
const hexL = (x) => hex(x, 16);
const print = console.log;

const TITLES = ["BODY", "HAND", "FACE", "WINGS", "CAMERA", "EXTRA-BODY"];

const FOLDER_PATH = "Binary\\mothead\\bin\\";

function processAnimBin(filePath) {
  const file = fs.readFileSync(filePath);
  const reader = new BinaryFileReader(file.buffer);

  const readLong = (offset) => Number(reader.readUInt64(offset));

  const readIntArray = (len) =>
    Array(len)
      .fill(0)
      .map(() => reader.readUInt32());

  const readLongArray = (len) =>
    Array(len)
      .fill(0)
      .map(() => readLong());

  reader.skip(4);
  const blocksCount = readIntArray(6);
  const listsCount = readIntArray(6);
  reader.skip(4);
  const blockOffsets = readLongArray(6);
  const listOffsets = readLongArray(6);

  const printEverything = false;

  // PRINTING BLOCKS INFORMATION
  print("===== BLOCKS =====");
  for (let i = 0; i < 6; i++) {
    const offset = blockOffsets[i];
    const count = blocksCount[i];
    reader.seek(offset);
    print("BLOCK:", TITLES[i], hex(offset), count);
    for (let j = 0; j < count; j++) {
      if (printEverything) {
        const values = readIntArray(14);
        const printVals = values.map((x) => hex(x)).join(" ");

        // const values = readLongArray(7);
        // const printVals = values.map(x => hexL(x)).join(" ");

        print(j.toString().padStart(5, " "), printVals);
      } else {
        const animKey = reader.readUInt32(); // 0x0
        reader.skip(4);
        const animOffset = readLong(); // 0x8
        reader.skip(8); // 0x10
        const flags = readIntArray(4);
        reader.skip(16);

        const values = [
          hex(animKey),
          hexL(animOffset),
          flags.map((x) => hex(x)).join(" "),
        ];
        print(j.toString().padStart(5, " "), values.join(" "));
      }
    }
    print();
  }

  // PRINTING LISTS INFORMATION
  print("===== LISTS =====");
  for (let i = 0; i < 6; i++) {
    const offset = listOffsets[i];
    const count = listsCount[i];
    reader.seek(offset);
    print("LIST:", TITLES[i], hex(offset), count);
    for (let j = 0; j < count; j++) {
      const values = [reader.readUInt32()];
      print(j.toString().padStart(5, " "), values.map((x) => hex(x)).join(" "));
    }
    print();
  }
}

function main() {
  const files = fs
    .readdirSync(FOLDER_PATH)
    .filter((file) => file.endsWith(".anmbin"));

  const charCode = process.argv[2];

  for (const file of files) {
    if (charCode && !file.includes(charCode)) continue;

    print("Processing File: %s", file);

    processAnimBin(`${FOLDER_PATH}/${file}`)
  }
}

main();

// anim.js
// const fs = require("fs");

// const FOLDER_PATH = "Binary/mothead/bin";
// const HEADER_SIZE = 56;

// const print = console.log;
// const hex = (x, len = 8) => x.toString(16).padStart(len, "0");
// const hexL = (x, len = 16) => x.toString(16).padStart(len, "0");

// function processAnimBin(filePath) {
//   const fd = fs.readFileSync(filePath);

//   const poolCounts = [];
//   for (let i = 0; i < 6; i++) {
//     poolCounts.push(fd.readUInt32LE(0x4 + i * 4));
//   }

//   const keyCounts = [];
//   for (let i = 0; i < 6; i++) {
//     keyCounts.push(fd.readUInt32LE(0x1c + i * 4));
//   }

//   const poolOffsets = [];
//   for (let i = 0; i < 6; i++) {
//     poolOffsets.push(fd.readBigUInt64LE(0x38 + i * 8));
//   }

//   const listOffsets = [];
//   for (let i = 0; i < 6; i++) {
//     listOffsets.push(fd.readBigUInt64LE(0x68 + i * 8));
//   }

//   // Printing
//   let offset = 0;
//   print(hex(offset), hex(fd.readUint32LE(offset)));
//   offset += 4;

//   for (let i = 0; i < 6; i++) {
//     print(hex(offset), hex(poolCounts[i]));
//     offset += 4;
//   }

//   for (let i = 0; i < 6; i++) {
//     print(hex(offset), hex(keyCounts[i]));
//     offset += 4;
//   }

//   print(hex(offset), hex(fd.readUint32LE(offset)));
//   offset += 4;

//   for (let i = 0; i < 6; i++) {
//     print(hex(offset), hexL(poolOffsets[i]));
//     offset += 8;
//   }

//   for (let i = 0; i < 6; i++) {
//     print(hex(offset), hexL(listOffsets[i]));
//     offset += 8;
//   }

//   for (let i = 0; i < 6; i++) {
//     const startOffset = Number(poolOffsets[i]);
//     for (let j = 0; j < poolCounts[i]; j++) {
//       const offset = startOffset + j * HEADER_SIZE;
//       const values = Array(HEADER_SIZE / 4)
//         .fill(0)
//         .map((_, k) => fd.readUInt32LE(offset + 4 * k));
//       print(hex(offset), values.map((x) => hex(x)).join(" "));
//     }
//   }

//   for (let i = 0; i < 6; i++) {
//     const startOffset = Number(listOffsets[i]);
//     for (let j = 0; j < keyCounts[i]; j++) {
//       const offset = startOffset + j * 4;
//       print(hex(offset), hex(fd.readUint32LE(offset)));
//     }
//   }
// }

// function main() {
//   const charCode = process.argv[2];

//   if (!charCode) {
//     print("Please provide a character code");
//     return;
//   }

//   const file = fs
//     .readdirSync(FOLDER_PATH)
//     .filter((file) => file.endsWith(".anmbin"))
//     .find((file) => file.includes(charCode));

//   const fullPath = `${FOLDER_PATH}/${file}`;
//   processAnimBin(fullPath);
// }

// main();
