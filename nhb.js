// This JS file is for reading .vbn files from Tekken 7's "tkdata > mothead > nua" folder

const fs = require("fs");
const BinaryFileReader = require("./binaryFileReader");
const print = console.log;
const hex = (num, len = 8) => `0x${num.toString(16).padStart(len, "0")}`;
const pad = (num, len = 5) => num.toString().padStart(len, " ");

const last = (arr) => (arr ? arr[arr.length - 1] : null);

function drawTree(bones) {
  const lines = [];
  lines.push("");
  lines.push("Hierarchy:");
  lines.push("");

  // Build index lookup (safer than relying on array index)
  const boneById = {};
  for (const bone of bones) {
    boneById[bone.index] = bone;
  }

  // Build children map
  const childrenMap = {};
  for (const bone of bones) {
    childrenMap[bone.index] = [];
  }

  for (const bone of bones) {
    if (bone.parentIndex >= 0 && childrenMap[bone.parentIndex]) {
      childrenMap[bone.parentIndex].push(bone.index);
    }
  }

  // Find roots
  const roots = bones.filter((b) => b.parentIndex === -1).map((b) => b.index);

  function drawBone(index, prefix = "", isLast = true) {
    const bone = boneById[index];

    const connector = prefix === "" ? "" : isLast ? "└─ " : "├─ ";

    lines.push(prefix + connector + `${bone.name} [${bone.index}]`);

    const children = childrenMap[index] || [];
    for (let i = 0; i < children.length; i++) {
      const childIndex = children[i];
      const lastChild = i === children.length - 1;

      const childPrefix =
        prefix + (prefix === "" ? "" : isLast ? "   " : "│  ");

      // 🔥 FIX: force prefix for first level children
      const finalPrefix =
        prefix === "" ? (isLast ? "   " : "│  ") : childPrefix;

      drawBone(childIndex, finalPrefix, lastChild);
    }
  }

  // Draw each root properly
  for (let i = 0; i < roots.length; i++) {
    const isLastRoot = i === roots.length - 1;
    drawBone(roots[i], "", isLastRoot);
  }

  return lines;
}

function processVbnFile(filePath) {
  // print(filePath);

  const reader = BinaryFileReader.open(filePath);
  if (reader.readString(4) !== " NBV") {
    print(`${filePath} is not a valid .vbn file`);
    return;
  }

  const bonesCount = reader.readUInt32(0x8);
  const bones = [];

  // ---- Read bones ----
  for (let i = 0; i < bonesCount; i++) {
    const offset = 0x1c + i * 0x4c;

    const boneName = reader.readNullTerminatedString(offset);
    const _0x40 = reader.readUInt32(offset + 0x40);
    const rawParent = reader.readUInt32(offset + 0x44);
    const _0x48 = reader.readUInt32(offset + 0x48);

    const floats = [];
    for (let j = 0; j < 9; j++) {
      // 0x1c + bonesCount * 0x4c is the offset of the first float
      // i * 36 is the offset of the first float of the i-th bone
      // j * 4 is the offset of the j-th float of the i-th bone
      const floatOffset = (0x1c + bonesCount * 0x4c) + (i * 36) + (j * 4);
      floats.push(reader.readFloat32(floatOffset));
    }

    bones.push({
      index: i,
      offset,
      name: boneName,
      _0x40,
      rawParent,
      parentIndex: rawParent === 0x0fffffff ? -1 : rawParent,
      _0x48,
      floats,
    });
  }

  reader.close();

  const lines = [];
  lines.push(`File: ${filePath}`);
  lines.push(`Total Bones: ${bonesCount}`);
  lines.push("");

  for (const bone of bones) {
    const parent =
      bone.parentIndex >= 0 && bones[bone.parentIndex]
        ? `${bones[bone.parentIndex].name} (${bone.parentIndex})`
        : "-";

    const boneStr =
      bone.parentIndex >= 0 ? `${bone.name} <-- ${parent}` : bone.name;

    const line = [
      hex(bone.offset),
      pad(bone.index),
      // `Offset: ${hex(bone.offset)}`,
      // `Index: ${bone.index}`,
      `0x40: ${bone._0x40}`,
      `0x48: ${hex(bone._0x48)}`,
      boneStr.padEnd(64, " "),
      // `Name: ${bone.name}`,
      // `ParentIndex: ${bone.parentIndex}`,
      // `ParentName: ${parent}`,
      // `RawParent(0x44): ${hex(bone.rawParent)}`,
      bone.floats.map((f) => f.toFixed(4)).join(", "),
    ].join(" | ");

    lines.push(line);
  }

  // Print to console
  // print(lines.join("\n"));

  // const diff = fileSize - floatBlock;
  // print(hex(floatBlock));
  // print(diff);
  // print(diff / bonesCount / 4);

  // Draw tree
  const treeLines = drawTree(bones);
  lines.push(...treeLines);

  // Write to file
  const outputPath = filePath + ".bones.txt";
  fs.writeFileSync(outputPath, lines.join("\n"));
  print(`Written: ${outputPath}`);
}

(() => {
  const files = fs.readdirSync("nua");
  for (const file of files) {
    if (file.endsWith(".vbn")) {
      processVbnFile(`nua/${file}`);
    }
  }
  // processVbnFile("nua/aki.vbn");
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
