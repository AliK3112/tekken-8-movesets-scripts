// Prints all the common animation keys

const fs = require("fs");
const BinaryFileReader = require("./binaryFileReader");

const hex = (x, length = 8) => "0x" + x.toString(16).padStart(length, "0");
const print = console.log;

const path = "Binary\\mothead\\bin\\com.anmbin";
// const data = require(path);
// console.log(data);

function main() {
  const file = fs.readFileSync(path);
  const reader = new BinaryFileReader(file.buffer);

  const readLong = (offset) => Number(reader.readUInt64(offset));

  // reader.skip(4);
  // const counts = Array(12).fill(0).map(() => reader.readUInt32());
  // print(counts);
  // print(hex(reader.getPosition()));
  // reader.skip(4);
  const count = reader.readUInt32(0x4);
  const offset = readLong(0x38);

  // print("Total:" count, hex(offset));

  reader.seek(offset);
  for (let i = 0; i < count; i++) {
    const animKey = reader.readUInt32(offset + i * 56);
    print(i, hex(animKey), animKey);
  }
}

main();
