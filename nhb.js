const fs = require("fs");
const BinaryFileReader = require("./binaryFileReader");
const print = console.log;
const hex = (num, len = 8) => `0x${num.toString(16).padStart(len, "0")}`;
const pad = (num, len = 5) => num.toString().padStart(len, " ");

const last = (arr) => arr ? arr[arr.length - 1] : null;

function processVbnFile(filePath) {
  print(filePath);
  const reader = BinaryFileReader.open(filePath);
  if (reader.readString(4) !== " NBV") {
    print(`${filePath} is not a valid .vbn file`);
    return;
  }
  const bonesCount = reader.readUInt32(0x8);

  // print("BONES:", bonesCount);

  const bones = [];
  for (let i = 0; i < bonesCount; i++) {
    const offset = 0x1c + i * 0x4c;

    // Read 0x20-byte name buffer (null-terminated)
    const boneName = reader.readNullTerminatedString(offset);
    const _0x40 = reader.readUInt32(offset + 0x40);
    const _0x44 = reader.readUInt32(offset + 0x44);
    const _0x48 = reader.readUInt32(offset + 0x48);
    bones.push({
      index: i,
      offset,
      name: boneName,
      _0x40,
      parent_bone_id: _0x44 === 0x0fffffff ? -1 : _0x44,
      _0x48,
    });
  }

  const floatStart = last(bones).offset + 0x4c;
  const diff = reader.getSize() - floatStart;
  
  const values = [
    filePath,
    reader.readUInt16(0x4),
    reader.readUInt16(0x6),
    bonesCount,
    reader.readUInt32(0xc),
    reader.readUInt32(0x10),
    reader.readUInt32(0x14),
    reader.readUInt32(0x18),
    // reader.readNullTerminatedString(0x1C),
    hex(floatStart),
    diff,
    diff / bonesCount,
  ];

  // print(values.join(" "));
  // return;

  for (const bone of bones) {
    const parentBone = bones[bone.parent_bone_id];
    const values = [
      hex(bone.offset),
      pad(bone.index),
      hex(bone._0x48),
      `Name: ${bone.name}`,
      `Parent: ${parentBone ? `${parentBone.name} (${parentBone.index})` : "-"}`,
    ];
    print(values.join(" | "));
  }
  print("BONES:", bonesCount);
  reader.seek(floatStart);
  print(hex(floatStart));
  print(diff);
  print(diff / bonesCount);
  reader.close();
}

(() => {
  // const files = fs.readdirSync("nua");
  // for (const file of files) {
  //   if (file.endsWith(".vbn")) {
  //     processVbnFile(`nua/${file}`);
  //   }
  // }
  processVbnFile("nua/dvj.vbn");
})();

/**
 * 0x00: " NBV"
 * 0x04: 2 x 2 byte values?
 * 0x08: bones
 * 0x0C: ???
 * 0x10: ???
 * 0x14: ???
 * 0x18: ???
 * 0x1C: name of bone [0]
 */
