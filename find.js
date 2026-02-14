const fs = require("fs");
const {
  getCharacterName,
  hex,
  getCodeById,
  CODE_MAPPING,
  readMovesList,
} = require("./utils");
const BinaryFileReader = require("./binaryFileReader");
// This script is for an attempt to try and understand move names

const printf = (...args) => process.stdout.write(args.join(" "));
const print = (...args) => console.log(...args);
const printn = (num, length = 5) => num.toString().padStart(length, " ");
const hexLong = (num) => hex(num, 16).toLowerCase();

const getCode = (filename) => {
  const fn = (x) => x.replace(".motbin", "");
  return CODE_MAPPING[fn(filename)];
};

const uniqueHashes = {};

const convertPtrToIdx = (current, parent, size) =>
  Number(current - parent) / size;

const tk_cancel = (context, position) => ({
  value: {
    command: context.readUInt64(position),
    extradata_idx: convertPtrToIdx(
      context.readUInt64(position + 16),
      context.readUInt64(0x1f0),
      4,
    ),
    requirement_idx: convertPtrToIdx(
      context.readUInt64(position + 8),
      context.readUInt64(0x180),
      20,
    ),
    frame_window_start: context.readUInt32(position + 24),
    frame_window_end: context.readUInt32(position + 28),
    starting_frame: context.readUInt32(position + 32),
    move_id: context.readUInt16(position + 36),
    cancel_option: context.readUInt16(position + 38),
  },
  size: 40,
});

/**
 * @param {BinaryFileReader} reader
 */
function getRecoveryFrame(reader, moveIdx, move) {
  const readLong = (offset) => Number(reader.readUInt64(offset));
  const cIndex = move.cancel_idx;
  const start = readLong(0x1d0) + 0x318;
  const end = readLong(0x1e0) + 0x318;
  const size = 40;
  let cOffset = start + cIndex * size;
  if (cOffset >= start && cOffset < end) {
    while (cOffset < end) {
      const cancel = reader.read(tk_cancel, cOffset);
      if (cancel.command === 0x8000n) {
        return cancel.starting_frame;
      }
      cOffset += size;
    }
  }
  return -1;
}

/**
 * @param {BinaryFileReader} reader
 * @param {number} targetKey
 */
function processFunc(reader, targetKey, charId) {
  const key = "anim_name_key";
  // const key = "name_key";
  const moves = readMovesList(reader).filter((m) => m[key] === targetKey);

  for (const move of moves) {
    const cancelFrame = getRecoveryFrame(reader, move.index, move);
    move.cancel_frame = cancelFrame;

    if (!uniqueHashes[move.name_key]) {
      uniqueHashes[move.name_key] = {
        name: move.name,
        length: move.name_length,
        cancel_frame: cancelFrame,
      };
    }

    printf(printn(reader.read(tk_charId), 5));
    printf(
      `${printn(getCodeById(charId), 4)} ${getCharacterName(reader).padEnd(
        20,
        " ",
      )}`,
    );
    printf(` ${printn(move.index)}`);
    printf(` ${hex(move.name_key)}`);
    printf(` ${printn(move.name_length)}`);
    printf(` ${printn(cancelFrame)}`);
    printf(` ${move.name ?? "-"}`);
    print();
  }
}

const tk_charId = (c) => ({
  value: (c.readInt32(0x160) - 1) / 0xffff,
  size: 4,
});

function main() {
  const folder = "./Binary/mothead/bin";
  const outputFolder = "./output";

  const argv2 = process.argv[2];
  let targetKey;

  if (typeof argv2 !== "string" || !argv2.trim()) {
    throw new Error(
      "Please provide a targetKey as a decimal or hexadecimal (0x...) number.",
    );
  }

  // Check for hex or valid decimal
  if (/^0x[0-9a-fA-F]+$/.test(argv2)) {
    targetKey = parseInt(argv2, 16);
  } else if (/^\d+$/.test(argv2)) {
    targetKey = parseInt(argv2, 10);
  } else {
    throw new Error(
      "targetKey must be a valid decimal or hexadecimal (0x...) number.",
    );
  }

  const files = fs
    .readdirSync(folder)
    .filter((file) => file.endsWith(".motbin"));

  const fn = (x) => x.replace(".motbin", "");
  files.sort((a, b) => CODE_MAPPING[fn(a)] - CODE_MAPPING[fn(b)]);

  console.log("FOLDER:", folder);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file === "ja4.motbin") continue;

    // if (charCode && !file.includes(charCode)) continue;

    // if (file !== "grl.motbin") return;
    const buffer = fs.readFileSync(`${folder}/${file}`);
    const reader = new BinaryFileReader(buffer.buffer);
    const charId = reader.read(tk_charId);
    // console.log(charId)
    // if (charId !== 28) return;

    // console.log(`Reading: ${file} [${charId}] - ${getCharacterName(reader)}`);

    processFunc(reader, targetKey, charId);
  }

  print();
  Object.entries(uniqueHashes)
    .sort(([, a], [, b]) => a.length - b.length)
    .forEach(([key, value]) => {
      print(
        hex(key),
        printn(value.length, 3),
        printn(value.cancel_frame, 3),
        value.name ?? "-",
      );
    });
  print("TOTAL: %d", Object.keys(uniqueHashes).length);

  const length = parseInt(process.argv[3]);

  if (Number.isNaN(length)) return;

  print(
    Object.entries(uniqueHashes)
      .filter(([_, v]) => v.length === length)
      .map(([k]) => hex(k))
      .join(","),
  );
}

main();
