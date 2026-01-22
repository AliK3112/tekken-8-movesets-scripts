const fs = require("fs");
const { getCharacterName, hex, CODE_MAPPING } = require("./utils");
const BinaryFileReader = require("./binaryFileReader");
// This script is for an attempt to try and understand move names

/**
 * 1457 Kz_sKAM00_ - key: 0x1606e24f, ordinal_id1: 0x7fff9 ordinal_id2: 0x1497714a
 */

const KEYS = [
  0x964f5b9e, 0xd88448a2, 0xa84b71e0, 0xa27d5221, 0x9b81329f, 0xadfb76c8,
  0x7def1f1c, 0x7ee2bc2c,
];

const REACTION_LABELS = [
  "FRONT",
  "CROUCH",
  "FRONT CH",
  "CROUCH CH",
  "LEFT",
  "LEFT CROUCH",
  "RIGHT",
  "RIGHT CROUCH",
  "BACK",
  "BACK CROUCH",
  "BLOCK",
  "BLOCK CROUCH",
  "WALL",
  "DOWN",
];
let REACTIONS_DICT = [];
let FORCED_DICT = [];

const getByte = (value, byteNumber) => (value >>> (byteNumber * 8)) & 0xff;

const toBytes = (bytes) =>
  Array.from(bytes, (b) => b & 0xff)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");

const readTxt = (path) => {
  const buffer = fs.readFileSync(path, "utf-8");
  return buffer.trim().split("\n").filter(Boolean);
};

const buildDict = () => {
  // const lines = readTxt("./kaz.txt");
  // return lines.reduce((obj, line) => {
  //   const [name, hash] = line.split(" ");
  //   obj[+hash.trim()] = name.trim();
  //   return obj;
  // }, {});
  try {
    return require("./name_keys.json");
  } catch {
    return {};
  }
  // return require("./merged_name_keys.json")
};

// const printf = (...args) => process.stdout.write(args.join(" "));
// const print = (...args) => console.log(...args);
const printn = (num, length = 5) => num.toString().padStart(length, " ");
const _hex = (x) => (x !== null ? hex(x).toLowerCase() : "null");
const hexLong = (num) => hex(num, 16).toLowerCase();

const tk_encrypted = (context, position) => ({
  value: {
    value: context.readUInt64(position),
    key: context.readUInt64(position + 8),
  },
  size: 16,
});

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
  const cIndex = Number(Buffer.from(move).readBigUInt64LE(0x98));
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
 */
function buildReactionsDictionary(reader) {
  const dict = Array.from({ length: 14 }, () => []);
  const start = Number(reader.readUInt64(0x168)) + 0x318;
  const count = Number(reader.readUInt64(0x178));
  for (let i = 0; i < count; i++) {
    const addr = start + i * 0x70;
    for (let j = 0; j < 14; j++) {
      const id = reader.readUInt16(addr + 0x50 + 2 * j);
      if (!dict[j].includes(id)) dict[j].push(id);
      // if ([1, 3, 5, 7, 9].includes(j)) {
      //   if (!dict[3].includes(id)) dict[3].push(id);
      // }
      // else if (j === 10 || j === 11) {
      //   if (!dict[1].includes(id)) dict[1].push(id);
      // } else if (j >= 12) {
      //   if (!dict[2].includes(id)) dict[2].push(id);
      // } else {
      //   if (!dict[0].includes(id)) dict[0].push(id);
      // }
    }
  }
  return dict;
}

/**
 * @param {BinaryFileReader} reader
 */
function buildForcedMovesDictionary(reader) {
  const dict = [];
  let start = 0,
    count = 0;
  const getStart = (offset) => Number(reader.readUInt64(offset)) + 0x318;
  const getCount = (offset) => Number(reader.readUInt64(offset));

  start = getStart(0x180);
  count = getCount(0x188);
  // Iterating requirements
  for (let i = 0; i < count; i++) {
    const addr = start + i * 20;
    const req = reader.readUInt32(addr);
    const param = reader.readUInt32(addr + 4);
    if (req === 0x8244 && !dict.includes(param)) dict.push(param);
  }

  start = getStart(0x200);
  count = getCount(0x208);
  // Iterating extraprops
  for (let i = 0; i < count; i++) {
    const addr = start + i * 40;
    const prop = reader.readUInt32(addr + 0x10);
    const param = reader.readUInt32(addr + 0x14);
    if (prop === 0x8244 && !dict.includes(param)) dict.push(param);
  }
  return dict;
}

const getIdFromName = (name) => {
  if (typeof name !== "string") return "";
  const num = name.split("_").at(1);
  return isNaN(+num) ? -1 : +num;
};

const decryptBytes = (moveBytes, attributeOffset, moveIdx) => {
  let currentOffset = attributeOffset;
  for (let j = 0; j < KEYS.length; j++) {
    const key = KEYS[j];
    for (let k = 0; k < 4; k++) {
      moveBytes[currentOffset + k] ^= getByte(key, k);
    }
    // const keyBytes = [0, 1, 2, 3].map((i) => getByte(key, i));
    // moveBytes[currentOffset + 0] ^= keyBytes[0];
    // moveBytes[currentOffset + 1] ^= keyBytes[1];
    // moveBytes[currentOffset + 2] ^= keyBytes[2];
    // moveBytes[currentOffset + 3] ^= keyBytes[3];
    currentOffset += 4;
  }
  return Buffer.from(moveBytes).readUInt32LE(
    attributeOffset + 4 * (moveIdx % 8),
  );
};

/**
 * @param {BinaryFileReader} reader
 */
function moveHasHitbox(reader, moveAddr) {
  for (let i = 0; i < 8; i++) {
    const hitboxAddr = moveAddr + 0x160 + 48 * i;
    const startup = reader.readInt32(hitboxAddr);
    const recovery = reader.readInt32(hitboxAddr + 4);
    const hitbox = reader.readInt32(hitboxAddr + 8);
    if (startup || recovery || hitbox) return true;
  }
  return false;
}

/**
 * @param {BinaryFileReader} reader
 */
function moveIsAnAttack(reader, moveAddr, moveIdx) {
  if (moveHasHitbox(reader, moveAddr)) return "ATTACK";
  // Check if it's a throw
  const startup = reader.readInt32(moveAddr + 0x158);
  const recovery = reader.readInt32(moveAddr + 0x15c);
  const bytes = reader.readArrayOfBytes(0x448, moveAddr);
  const hitlevel = decryptBytes(bytes, 0x78, moveIdx) & 0xfff;
  if (hitlevel === 0xa00) {
    if (REACTIONS_DICT[0].includes(moveIdx)) return "THROW REACTION";
    return "THROW";
  }
  // if (hitlevel !== 0) return "ATTACK";
  // if (hitlevel === 4195602) return "THROW";
  // if (startup || recovery || hitlevel) return "THROW2";
  // Check if it's a reaction by checking
  // move IDs in reactions array
  if (FORCED_DICT.includes(moveIdx)) return "FORCED";

  for (let j = 0; j < REACTION_LABELS.length; j++) {
    if (REACTIONS_DICT[j].includes(moveIdx))
      return "REACTION: " + REACTION_LABELS[j];
  }
  // if (REACTIONS_DICT[1].includes(moveIdx)) return "BLOCK REACTION";
  // if (REACTIONS_DICT[2].includes(moveIdx)) return "DOWN REACTION";
  // if (REACTIONS_DICT[3].includes(moveIdx)) return "CROUCH REACTION";
  return "";
}

/**
 * @param {BinaryFileReader} reader
 * @param {number[]} animKeysArray
 */
function readMoves(reader, animKeysArray = []) {
  print(getCharacterName(reader));

  const charNameOffset = reader.readUInt64(0x10);
  const creatorNameOffset = reader.readUInt64(0x18);
  const dateOffset = reader.readUInt64(0x20);
  const stringBlockEnd = reader.readInt(0x170);

  print("Character Name Length: ", creatorNameOffset - charNameOffset - 1n);
  print("Creator Name Length: ", dateOffset - creatorNameOffset - 1n);
  print("Some Hash?:", hex(reader.readInt32(0x4)));
  // print("Character Name Offset: ", charNameOffset);
  // print("Creator Name Offset: ", creatorNameOffset);

  const aliases = Array(60)
    .fill(0)
    .map((_, i) => reader.readUInt16(0x30 + i * 2));
  // .reduce((dict, alias, i) => {
  //   dict[alias] = 0x8000 + i;
  //   return dict;
  // }, {});

  const getAliasId = (mIdx) => {
    const idx = aliases.findIndex((x) => x === mIdx);
    if (idx !== -1) {
      return idx + 0x8000;
    }
  };

  // console.log(aliases);

  // Dictionary
  const namesDict = buildDict();
  // print(namesDict)
  // return;

  // Reading Moves Array
  const readMoveNameOffset = (addr) => Number(reader.readInt(addr + 0x40, 8));
  const readAnimNameOffset = (addr) => Number(reader.readInt(addr + 0x48, 8));

  // const readMoveNameOffset = (addr) => Number(reader.readInt(addr + 0x08, 8));
  // const readAnimNameOffset = (addr) => Number(reader.readInt(addr + 0x10, 8));

  // const getStart = (offset) => Number(reader.readUInt64(offset) - parentAddr)
  // const getCount = (offset) => reader.readUInt32(offset)

  // const start = getStart(0x230)
  // const count = getCount(0x238)

  const getStart = (offset) => reader.readUInt32(offset);
  const getCount = (offset) => reader.readUInt32(offset);

  const start = getStart(0x230) + 0x318;
  const count = getCount(0x238);
  print(hexLong(start), count);
  const MOVE_SIZE = 0x448;
  // const MOVE_SIZE = 0x3a0; // For v1.00
  const OFFSET_NAME_KEY = 0x00;
  const OFFSET_ANIM_NAME_KEY = 0x20;
  const OFFSET_ANIM_KEY = 0x50;
  const OFFSET_HITLEVEL = 0x78;
  const OFFSET_ORDINAL1 = 0xd0;
  const OFFSET_ORDINAL2 = 0xf0;

  for (let i = 0; i < count; i++) {
    const addr = start + i * MOVE_SIZE;

    // Readings for V1.00
    // const nameKey = reader.readUInt32(addr + 0x0);
    // const animNameKey = reader.readUInt32(addr + 0x4);
    // const hitlevel = reader.readUInt32(addr + 0x20);
    // const ordinal1 = 0;
    // const ordinal2 = 0;
    // const cancelFrame = 0;

    // const nameKey = decrypt(reader.read(tk_encrypted, addr))
    // const animNameKey = decrypt(reader.read(tk_encrypted, addr + 0x20))
    // const animKey = reader.readInt(addr + 0x50);
    // const bytes = Array(8).fill(0).map((_, i) => reader.readUInt32(addr + i * 4));

    // TRYING TO DECRYPT THE MOVE NAME FIELD FROM RAW BYTE FILE
    const bytes = reader.readArrayOfBytes(MOVE_SIZE, addr);
    const nameKey = decryptBytes(bytes, OFFSET_NAME_KEY, i);
    const animNameKey = decryptBytes(bytes, OFFSET_ANIM_NAME_KEY, i);
    const animKey = reader.readInt32(addr + OFFSET_ANIM_KEY);
    const hitlevel = decryptBytes(bytes, OFFSET_HITLEVEL, i);
    const ordinal1 = decryptBytes(bytes, OFFSET_ORDINAL1, i);
    const ordinal2 = decryptBytes(bytes, OFFSET_ORDINAL2, i);
    const voiceclip = Number(reader.readInt64(addr + 0x130));

    const offset1 = readMoveNameOffset(addr);
    const offset2 = readAnimNameOffset(addr);

    const cancelFrame = getRecoveryFrame(reader, i, bytes);

    let animLength = "-";
    if (i + 1 < count) {
      animLength = readMoveNameOffset(addr + MOVE_SIZE) - offset2;
    } else {
      animLength = stringBlockEnd - offset2;
    }
    const nameLength = offset2 - offset1 - 1;
    animLength--;

    // hashesDict[nameKey] ??= { count: 0, length: nameLength };
    // hashesDict[nameKey].count++;

    printf(printn(i));
    // printf(` ${nameKey}`)
    printf(` ${_hex(nameKey)}`);
    printf(` ${_hex(animNameKey)}`);
    // printf(` ${_hex(animKey)}`);
    // if (animKeysArray[i]) printf(` ${_hex(animKeysArray[i])}`);
    // printf(` ${_hex(offset1)}`)
    // printf(` ${_hex(offset2)}`);
    // printf(` ${_hex(hitlevel)}`)
    printf(printn(nameLength));
    printf(printn(animLength));
    printf(printn(cancelFrame, 6));
    // printf(` ${_hex(ordinal1)}`);
    // printf(` ${_hex(ordinal2)}`);
    let name = namesDict[nameKey];
    name = name ? name + " " : "-";
    printf(` ${name.padEnd(27, " ")}`);
    const status = moveIsAnAttack(reader, addr, i);
    if (status) printf(printn(status));
    if (getAliasId(i)) printf(` (${getAliasId(i)})`);
    // printf(` ${voiceclip}`);
    // printf(` ${cancelFrame}`);
    printf("\n");
    // printf(bytes.map(x => hex(+x, 2)).join(", "))
  }
}

function decryptAttackType(value) {
  const toBytes = (num) => Array.from(Buffer.from(Uint32Array.of(num).buffer));
  const fromBytes = (bytes) =>
    new DataView(Uint8Array.from(bytes).buffer).getUint32(0, true);

  // let res = ((value ^ 0x1d) << 0x1c) / 0x10
  // if (res < 0) res = -res
  let res = (value ^ 0x1d) << 0x1c;
  res = Math.floor(res / 0x10);
  const bytes = toBytes(res);
  bytes.reverse();
  print(toBytes(res), bytes);
  return fromBytes(bytes);
}

function readAnims(file) {
  try {
    const buffer = fs.readFileSync(file);
    const reader = new BinaryFileReader(buffer.buffer);
    const count = reader.readUInt32(0x1c);
    // console.log("count", count);
    const array = Array(count).fill(0);
    // console.log("offset", hex(reader.readUInt64(0x68)))
    reader.seek(Number(reader.readUInt64(0x68)));
    for (let i = 0; i < count; i++) {
      array[i] = reader.readUInt32();
    }
    return array;
  } catch (err) {
    return [];
  }
}

const tk_charId = (c) => ({
  value: (c.readInt32(0x160) - 1) / 0xffff,
  size: 4,
});

function main() {
  // const folder = "./extracted_chars_2_08";
  const folder = "./Binary/mothead/bin";
  const outputFolder = "./output";

  const charCode = process.argv[2];

  // Ensure output folder exists
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  const files = fs
    .readdirSync(folder)
    .filter((file) => file.endsWith(".motbin"));

  const fn = (x) => x.replace(".motbin", "");
  files.sort((a, b) => CODE_MAPPING[fn(a)] - CODE_MAPPING[fn(b)]);

  console.log("FOLDER:", folder);

  // files.sort((a, b) => getIdFromName(a) - getIdFromName(b));

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file === "ja4.motbin") continue;

    if (charCode && !file.includes(charCode)) continue;

    // Generate output file name: e.g. 'grl.motbin' => 'output/grl.txt'
    const base = file.replace(/\.motbin$/, "");
    const animFile = `${folder}/${base}.anmbin`;
    const outputFile = `${outputFolder}/${base}.txt`;

    // if (file !== "grl.motbin") return;
    const buffer = fs.readFileSync(`${folder}/${file}`);
    const reader = new BinaryFileReader(buffer.buffer);
    const charId = reader.read(tk_charId);
    const someHash = reader.readUInt32(0x4);
    // console.log(charId)
    // if (charId !== 28) return;
    REACTIONS_DICT = buildReactionsDictionary(reader);
    FORCED_DICT = buildForcedMovesDictionary(reader);

    // Print to console for progress monitoring
    console.log(
      `Extracting: ${file} [${charId}] -> ${outputFile}. ${hex(someHash)}`,
    );

    // Redirect output to file
    const origStdoutWrite = process.stdout.write.bind(process.stdout);
    const outStream = fs.createWriteStream(outputFile, { flags: "w" });

    // Override print/printf to use this outStream
    global.print = function (...args) {
      outStream.write(args.join(" ") + "\n");
    };
    global.printf = function (...args) {
      outStream.write(args.join(""));
    };

    // const animKeysArray = readAnims(animFile);
    const animKeysArray = [];
    readMoves(reader, animKeysArray);

    // Cleanup and restore
    outStream.end();
    global.print = console.log;
    global.printf = function (...args) {
      process.stdout.write(args.join(""));
    };
  }
}

main();
