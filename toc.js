const { readFileSync } = require("fs");
const BinaryFileReader = require("./binaryFileReader");

const PATH = "cpp/toc.bin";

const print = (...args) => console.log(...args);
const hex = (n, w = 8) => "0x" + n.toString(16).toUpperCase().padStart(w, "0");

function padRight(str, len) {
  return str.toString().padEnd(len, " ");
}

function TkBinEntry(ctx, entryOffset) {
  return {
    size: 0x40,
    value: {
      signature: ctx.readUInt64(entryOffset),
      decryptFlag: ctx.readUInt8(entryOffset + 0x8),
      encKeyIndex: ctx.readUInt8(entryOffset + 0x9),
      decryptionChecksum: ctx.readUInt8(entryOffset + 0xA),
      decompressionChecksum: ctx.readUInt8(entryOffset + 0xB),
      _0xC: ctx.readUInt32(entryOffset + 0xC),
      hashSrc: ctx.readUInt32(entryOffset + 0x10),
      _0x14: ctx.readUInt32(entryOffset + 0x14),
      offset: ctx.readUInt32(entryOffset + 0x18),
      size: ctx.readUInt32(entryOffset + 0x20),
      size2: ctx.readUInt32(entryOffset + 0x28),
      _0x30: ctx.readUInt32(entryOffset + 0x30),
      _0x38: ctx.readUInt32(entryOffset + 0x38),
    },
  }
}

function main() {
  const stream = readFileSync(PATH);
  const reader = new BinaryFileReader(stream.buffer);

  print("TOC HEADER:", reader.readString(8, 0));
  const listSize = reader.readUInt32(0x8);
  const listOffset = reader.readUInt32(0x10);
  print(`List Offset: ${hex(listOffset)}  List Size: ${listSize}`);
  print("");
  print("Flag = Decryption Flag")
  print("KIdx = Key Index. Used for picking a decryption key outta the key pool")
  print("Chk1 = Checksum for Decryption")
  print("Chk2 = Checksum for Decompression")
  print("HashSrc = This is hashed (FNV-1a) to build the TOC")
  print("Size2 = Allegedly, decrypted & uncompressed file size. This value is ALWAYS greater than `Size` unless Flg1 is 0")
  print("");

  // const dict = {};
  // for (let i = 0; i < listSize; i++) {
  //   const entryOffset = listOffset + i * 0x40;
  //   const entry = reader.read(TkBinEntry, entryOffset);
  //   // print(`#${i + 1} ${hex(entry.signature)} Off:${hex(entry.offset)} Size:${hex(entry.size)} DecFlag:${hex(entry.decryptFlag,2)} KeyIdx:${hex(entry.encKeyIndex,2)} DecChk:${hex(entry.decryptionChecksum,2)} DecmpChk:${hex(entry.decompressionChecksum,2)}`);

  //   // Discovered that "hashSrc" isn't unique, despite being used as a hashing value
  //   // TODO: Check if "hashSrc" is unique
  //   const value = entry.hashSrc;
  //   dict[value] ??= [];
  //   dict[value].push(i+1);
  // }

  // Object.keys(dict).sort((a, b) => Number(a) - Number(b)).forEach(key => {
  //   print(`HashSrc: ${hex(+key, 2)}  Entries: [${dict[key].join(", ")}]`);
  // })

  // return;

  // Define consistent column widths
  const colWidths = {
    Idx: 4,
    Signature: 14,
    Flag: 8,
    keyIdx: 8,
    Chk1: 8,
    Chk2: 8,
    _0xC: 14,
    HashSrc: 14,
    _0x14: 14,
    Offset: 14,
    Size: 14,
    Size2: 14,
    _0x30: 22,
    _0x38: 22,
  };

  const headerCols = [
    "Idx",
    "Signature",
    "Flag", // decryptionFlag
    "keyIdx", // aesKeyIndex
    "Chk1", // decryptionChecksum
    "Chk2", // decompressionChecksum
    // "_0xC",
    "HashSrc", // FNV-1a hash index
    // "_0x14",
    "Offset",
    "Size",
    "Size2", // uncompressed file size? this value is always less than the size when the decryption flag (0x8) is set to 0
    "_0x30",
    "_0x38"
  ];

  // Print header
  print(headerCols.map(h => padRight(h, colWidths[h])).join(" "));
  print("-".repeat(Object.values(colWidths).reduce((a, b) => a + b) + headerCols.length - 1));

  // Entries
  for (let i = 0; i < listSize; i++) {
    const entryOffset = listOffset + i * 0x40;
    const entry = reader.read((ctx) => ({
      size: 0x40,
      value: {
        signature: ctx.readUInt64(entryOffset),
        _0x8: ctx.readUInt8(entryOffset + 0x8),
        _0x9: ctx.readUInt8(entryOffset + 0x9),
        _0xA: ctx.readUInt8(entryOffset + 0xA),
        _0xB: ctx.readUInt8(entryOffset + 0xB),
        _0xC: ctx.readUInt32(entryOffset + 0xC),
        _0x10: ctx.readUInt32(entryOffset + 0x10),
        _0x14: ctx.readUInt32(entryOffset + 0x14),
        offset: ctx.readUInt32(entryOffset + 0x18),
        size: ctx.readUInt32(entryOffset + 0x20),
        _0x28: ctx.readUInt32(entryOffset + 0x28),
        _0x30: ctx.readUInt32(entryOffset + 0x30),
        _0x38: ctx.readUInt32(entryOffset + 0x38),
      },
    }));

    const row = [
      padRight((i + 1).toString(), colWidths.Idx),
      padRight(hex(entry.signature), colWidths.Signature),
      padRight(hex(entry._0x8, 2), colWidths.Flag),
      padRight(hex(entry._0x9, 2), colWidths.keyIdx),
      padRight(hex(entry._0xA, 2), colWidths.Chk1),
      padRight(hex(entry._0xB, 2), colWidths.Chk2),
      // padRight(hex(entry._0xC), colWidths._0xC),
      padRight(hex(entry._0x10), colWidths.HashSrc),
      // padRight(hex(entry._0x14), colWidths._0x14),
      padRight(hex(entry.offset), colWidths.Offset),
      padRight(hex(entry.size), colWidths.Size),
      padRight(hex(entry._0x28), colWidths.Size2),
      // padRight(entry.size < entry._0x28),
      padRight(hex(entry._0x30, 16), colWidths._0x30),
      padRight(hex(entry._0x38, 16), colWidths._0x38),
    ];

    print(row.join(" "));
  }

}

main();
