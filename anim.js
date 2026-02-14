// Prints all the common animation keys

const fs = require("fs");
const BinaryFileReader = require("./binaryFileReader");

// const hex = (x, length = 8) => "0x" + x.toString(16).padStart(length, "0");
const hex = (x, length = 8) => x.toString(16).padStart(length, "0");
const hexL = (x) => hex(x, 16);
const print = console.log;

const TITLES = ["BODY", "HAND", "FACE", "WINGS", "CAMERA", "EXTRA-BODY"];

const PATH = "Binary\\mothead\\bin\\com.anmbin";

function main() {
  const file = fs.readFileSync(PATH);
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
        const printVals = values.map(x => hex(x)).join(" ");

        // const values = readLongArray(7);
        // const printVals = values.map(x => hexL(x)).join(" ");

        print(
          j.toString().padStart(5, " "),
          printVals,
        );
      } else {
        const animKey = reader.readUInt32(); // 0x0
        reader.skip(4);
        const animOffset = readLong(); // 0x8
        reader.skip(8); // 0x10
        const flags = readIntArray(6);
        reader.skip(8); // 0x30

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

main();
