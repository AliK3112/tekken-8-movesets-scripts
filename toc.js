const { readFileSync } = require("fs");
const BinaryFileReader = require("./binaryFileReader");

const PATH = "cpp/toc.bin";

const print = (...args) => console.log(...args);
const hex = (n, w = 8) => "0x" + n.toString(16).toUpperCase().padStart(w, "0");

function padRight(str, len) {
  return str.toString().padEnd(len, " ");
}

function main() {
  const stream = readFileSync(PATH);
  const reader = new BinaryFileReader(stream.buffer);

  print("TOC HEADER:", reader.readString(8, 0));
  const listSize = reader.readUInt32(0x8);
  const listOffset = reader.readUInt32(0x10);
  print(`List Offset: ${hex(listOffset)}  List Size: ${listSize}`);
  print("");

  // Define consistent column widths
  const colWidths = {
    Idx: 4,
    Signature: 14,
    _0x8: 8,
    _0x9: 8,
    _0xA: 8,
    _0xB: 8,
    _0xC: 14,
    _0x10: 8,
    _0x11: 8,
    _0x12: 8,
    _0x13: 8,
    _0x14: 14,
    Offset: 14,
    Size: 14,
    _0x28: 14,
    _0x30: 22,
    _0x38: 22,
  };

  const headerCols = [
    "Idx",
    "Signature",
    "_0x8", // decryptionFlag
    "_0x9", // aesKeyIndex
    "_0xA", // decryptionChecksum
    "_0xB", // decompressionChecksum
    // "_0xC",
    "_0x10", // FNV-1a hash index
    "_0x11",
    "_0x12",
    "_0x13",
    // "_0x14",
    "Offset",
    "Size",
    "_0x28", // uncompressed file size? this value is always less than the size when the decryption flag (0x8) is set to 0
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
        _0x10: ctx.readUInt8(entryOffset + 0x10),
        _0x11: ctx.readUInt8(entryOffset + 0x11),
        _0x12: ctx.readUInt8(entryOffset + 0x12),
        _0x13: ctx.readUInt8(entryOffset + 0x13),
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
      padRight(hex(entry._0x8, 2), colWidths._0x8),
      padRight(hex(entry._0x9, 2), colWidths._0x9),
      padRight(hex(entry._0xA, 2), colWidths._0xA),
      padRight(hex(entry._0xB, 2), colWidths._0xB),
      // padRight(hex(entry._0xC), colWidths._0xC),
      padRight(hex(entry._0x10, 2), colWidths._0x10),
      padRight(hex(entry._0x11, 2), colWidths._0x11),
      padRight(hex(entry._0x12, 2), colWidths._0x12),
      padRight(hex(entry._0x13, 2), colWidths._0x13),
      // padRight(hex(entry._0x14), colWidths._0x14),
      padRight(hex(entry.offset), colWidths.Offset),
      padRight(hex(entry.size), colWidths.Size),
      padRight(hex(entry._0x28), colWidths._0x28),
      // padRight(entry.size < entry._0x28),
      padRight(hex(entry._0x30, 16), colWidths._0x30),
      padRight(hex(entry._0x38, 16), colWidths._0x38),
    ];

    print(row.join(" "));
  }
}

main();
