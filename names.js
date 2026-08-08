const fs = require("fs");
const get = require("lodash/get");
const { getCharacterName, CODE_MAPPING } = require("./utils");
const BinaryFileReader = require("./binaryFileReader");

const IS_CNT = false;

const OFFSETS = {
  retail: {
    BASE: 0x318,
    CHARID: 0x160,
    LIST: {
      ALIAS: 0x30,
      REACTIONS_START: 0x168,
      STRING_BLOCK_END: 0x170,
      REACTIONS_COUNT: 0x178,
      REQUIREMENTS_START: 0x180,
      REQUIREMENTS_COUNT: 0x188,
      CANCELS_START: 0x1d0,
      CANCELS_COUNT: 0x1d8,
      GROUP_CANCELS_START: 0x1e0,
      GROUP_CANCELS_COUNT: 0x1e8,
      CANCEL_EXTRADATA_START: 0x1f0,
      CANCEL_EXTRADATA_COUNT: 0x1f8,
      EXTRA_MOVE_PROPERTIES_START: 0x200,
      EXTRA_MOVE_PROPERTIES_COUNT: 0x208,
      MOVES_START: 0x230,
      MOVES_COUNT: 0x238,
    },
    MOVE: {
      NAME_KEY: 0x0,
      ANIM_NAME_KEY: 0x20,
      NAME: 0x40,
      ANIM_NAME: 0x48,
      ANIM_KEY: 0x50,
      HURT_BOX: 0x58,
      HITLEVEL: 0x78,
      CANCEL_IDX: 0x98,
      ORDINAL1: 0xd0,
      ORDINAL2: 0xf0,
      VOICECLIP: 0x130,
      STARTUP: 0x158,
      RECOVERY: 0x15c,
      HITBOX: 0x160,
    },
  },
  cnt: {
    BASE: 0x310,
    CHARID: 0x154,
    LIST: {
      ALIAS: 0x30,
      REACTIONS_START: 0x160,
      STRING_BLOCK_END: 0x168,
      REACTIONS_COUNT: 0x170,
      REQUIREMENTS_START: 0x178,
      REQUIREMENTS_COUNT: 0x180,
      CANCELS_START: 0x1c8,
      CANCELS_COUNT: 0x1d0,
      GROUP_CANCELS_START: 0x1d8,
      GROUP_CANCELS_COUNT: 0x1e0,
      CANCEL_EXTRADATA_START: 0x1e8,
      CANCEL_EXTRADATA_COUNT: 0x1f0,
      EXTRA_MOVE_PROPERTIES_START: 0x1f8,
      EXTRA_MOVE_PROPERTIES_COUNT: 0x200,
      MOVES_START: 0x228,
      MOVES_COUNT: 0x230,
    },
    MOVE: {
      NAME_KEY: 0x0,
      ANIM_NAME_KEY: 0x4,
      NAME: 0x8,
      ANIM_NAME: 0x10,
      ANIM_KEY: 0x18,
      HURT_BOX: 0x20,
      HITLEVEL: 0x24,
      CANCEL_IDX: 0x28,
      ORDINAL1: 0x60,
      ORDINAL2: 0x64,
      VOICECLIP: 0x88,
      STARTUP: 0xB0,
      RECOVERY: 0xB4,
      HITBOX: 0xB8,
    },
  },
};

const SIZES = {
  retail: {
    LIST: {
      ALIAS: 60,
    },
    MOVE: {
      BASE: 0x448,
      HITBOX: 48,
    }
  },
  cnt: {
    LIST: {
      ALIAS: 57,
    },
    MOVE: {
      BASE: 0x380,
      HITBOX: 44,
    }
  }
};

const getOffset = (key, version = IS_CNT ? "cnt" : "retail") => {
  if (!["retail", "cnt"].includes(version)) return null;
  return get(OFFSETS, [version, ...key.split(".")], 0);
};

const getSize = (key, version = IS_CNT ? "cnt" : "retail") => {
  if (!["retail", "cnt"].includes(version)) return null;
  return get(SIZES, [version, ...key.split(".")], 0);;
};

const hex = (num, length = 8) => "0x" + Number(num).toString(16).padStart(length, "0");
const Hex = (num, length = 8) => hex(num, length).replace("0x", "").toUpperCase();

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
  try {
    return require("./name_keys.json");
  } catch {
    return {};
  }
};

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
      context.readUInt64(getOffset("LIST.CANCEL_EXTRADATA_START")),
      4,
    ),
    requirement_idx: convertPtrToIdx(
      context.readUInt64(position + 8),
      context.readUInt64(getOffset("LIST.REQUIREMENTS_START")),
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
  const cIndex = Number(Buffer.from(move).readBigUInt64LE(getOffset("MOVE.CANCEL_IDX")));
  const start = readLong(getOffset("LIST.CANCELS_START")) + getOffset("BASE");
  const end = readLong(getOffset("LIST.GROUP_CANCELS_START")) + getOffset("BASE");
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
  const readLong = (offset) => Number(reader.readUInt64(offset));

  const dict = Array.from({ length: 14 }, () => []);
  const start = readLong(getOffset("LIST.REACTIONS_START")) + getOffset("BASE");
  const count = readLong(getOffset("LIST.REACTIONS_COUNT"));

  for (let i = 0; i < count; i++) {
    const addr = start + i * 0x70;
    for (let j = 0; j < 14; j++) {
      const id = reader.readUInt16(addr + 0x50 + 2 * j);
      if (!dict[j].includes(id)) dict[j].push(id);
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
  const getStart = (offset) => Number(reader.readUInt64(offset)) + getOffset("BASE");
  const getCount = (offset) => Number(reader.readUInt64(offset));

  start = getStart(getOffset("LIST.REQUIREMENTS_START"));
  count = getCount(getOffset("LIST.REQUIREMENTS_COUNT"));
  // Iterating requirements
  for (let i = 0; i < count; i++) {
    const addr = start + i * 20;
    const req = reader.readUInt32(addr);
    const param = reader.readUInt32(addr + 4);
    if (req === 0x8244 && !dict.includes(param)) dict.push(param);
  }

  start = getStart(getOffset("LIST.EXTRA_MOVE_PROPERTIES_START"));
  count = getCount(getOffset("LIST.EXTRA_MOVE_PROPERTIES_COUNT"));
  // Iterating extraprops
  for (let i = 0; i < count; i++) {
    const addr = start + i * 40;
    const prop = reader.readUInt32(addr + 0x10);
    const param = reader.readUInt32(addr + 0x14);
    if (prop === 0x8244 && !dict.includes(param)) dict.push(param);
  }
  return dict;
}

const decryptBytes = (moveBytes, attributeOffset, moveIdx) => {
  if (IS_CNT) {
    return Buffer.from(moveBytes).readUInt32LE(attributeOffset);
  }
  let currentOffset = attributeOffset;
  for (let j = 0; j < KEYS.length; j++) {
    const key = KEYS[j];
    for (let k = 0; k < 4; k++) {
      moveBytes[currentOffset + k] ^= getByte(key, k);
    }
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
    const hitboxAddr = moveAddr + getOffset("MOVE.HITBOX") + getSize("MOVE.HITBOX") * i;
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
  const startup = reader.readInt32(moveAddr + getOffset("MOVE.STARTUP"));
  const recovery = reader.readInt32(moveAddr + getOffset("MOVE.RECOVERY"));
  const bytes = reader.readArrayOfBytes(getSize("MOVE.BASE"), moveAddr);
  const hitlevel = decryptBytes(bytes, getOffset("MOVE.HITLEVEL"), moveIdx) & 0xfff;
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
  return "";
}

/**
 * @param {BinaryFileReader} reader
 * @param {number} charId
 * @param {number[]} animKeysArray
 */
function readMoves(reader, charId, animKeysArray = []) {
  print(getCharacterName(charId));

  const charNameOffset = reader.readUInt64(0x10);
  const creatorNameOffset = reader.readUInt64(0x18);
  const dateOffset = reader.readUInt64(0x20);
  const stringBlockEnd = reader.readInt(getOffset("LIST.STRING_BLOCK_END"));

  print("Character Name Length: ", creatorNameOffset - charNameOffset - 1n);
  print("Creator Name Length: ", dateOffset - creatorNameOffset - 1n);
  print("Compile Date:", (reader.readInt32(0x4)));
  // print("Character Name Offset: ", charNameOffset);
  // print("Creator Name Offset: ", creatorNameOffset);

  const aliases = Array(getSize("LIST.ALIAS"))
    .fill(0)
    .map((_, i) => reader.readUInt16(getOffset("LIST.ALIAS") + i * 2));

  const getAliasId = (mIdx) => {
    const idx = aliases.findIndex((x) => x === mIdx);
    if (idx !== -1) {
      return idx + 0x8000;
    }
  };

  const readArray = (offset, size = 8) => {
    const integers = [];
    for (let i = 0; i < size; i++) {
      integers.push(reader.readUInt32(offset + i * 4));
    }
    return integers;
  };

  const readDecodedValue = (offset, idx) => {
    if (IS_CNT) {
      return reader.readUInt32(offset);
    }
    const integers = readArray(offset, KEYS.length);
    for (let i = 0; i < KEYS.length; i++) {
      integers[i] = (integers[i] ^ KEYS[i]) >>> 0;
    }
    return integers[idx % KEYS.length];
  };

  // Dictionary
  const namesDict = buildDict();

  // Reading Moves Array
  const readMoveNameOffset = (addr) => Number(reader.readInt(addr + getOffset("MOVE.NAME"), 8));
  const readAnimNameOffset = (addr) => Number(reader.readInt(addr + getOffset("MOVE.ANIM_NAME"), 8));

  const getStart = (offset) => reader.readUInt32(offset);
  const getCount = (offset) => reader.readUInt32(offset);

  const start = getStart(getOffset("LIST.MOVES_START")) + getOffset("BASE");
  const count = getCount(getOffset("LIST.MOVES_COUNT"));
  print("Moves Count:", count);
  const MOVE_SIZE = getSize("MOVE.BASE");
  // const MOVE_SIZE = 0x3a0; // For v1.00
  const OFFSET_NAME_KEY = getOffset("MOVE.NAME_KEY");
  const OFFSET_ANIM_NAME_KEY = getOffset("MOVE.ANIM_NAME_KEY");
  const OFFSET_ANIM_KEY = getOffset("MOVE.ANIM_KEY");
  const OFFSET_HURT_BOX = getOffset("MOVE.HURT_BOX");
  const OFFSET_HITLEVEL = getOffset("MOVE.HITLEVEL");
  const OFFSET_ORDINAL1 = getOffset("MOVE.ORDINAL1");
  const OFFSET_ORDINAL2 = getOffset("MOVE.ORDINAL2");

  for (let i = 0; i < count; i++) {
    const addr = start + i * MOVE_SIZE;

    // TRYING TO DECRYPT THE MOVE NAME FIELD FROM RAW BYTE FILE
    const bytes = reader.readArrayOfBytes(MOVE_SIZE, addr);
    const nameKey = readDecodedValue(addr + OFFSET_NAME_KEY, i);
    const animNameKey = readDecodedValue(addr + OFFSET_ANIM_NAME_KEY, i);
    const animKey = reader.readInt32(addr + OFFSET_ANIM_KEY);
    const hitlevel = readDecodedValue(addr + OFFSET_HITLEVEL, i);
    const vuln = readDecodedValue(addr + OFFSET_HURT_BOX, i);
    const ordinal1 = readDecodedValue(addr + OFFSET_ORDINAL1, i);
    const ordinal2 = readDecodedValue(addr + OFFSET_ORDINAL2, i);
    const voiceclip = Number(reader.readInt64(addr + getOffset("MOVE.VOICECLIP")));

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

    const status = moveIsAnAttack(reader, addr, i);
    const aliasId = getAliasId(i);
    const moveName = namesDict[nameKey] ? namesDict[nameKey] : "-";
    const animName = namesDict[animNameKey] ? namesDict[animNameKey] : "-";
    const padLen = 26;
    const paddedName = moveName.padEnd(padLen, " ");
    const paddedAnimName = animName.padEnd(padLen, " ");

    const values = [
      printn(i),
      hex(nameKey),
      hex(animNameKey),
      Hex(animKeysArray[animKey]),
      printn(nameLength),
      printn(animLength),
      // moveName,
      paddedName,
      paddedAnimName,
      status,
      aliasId ? printn(aliasId) : "",
    ].filter(Boolean);

    print(values.join(" "));
  }
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
  value: (c.readInt32(getOffset("CHARID")) - 1) / 0xffff,
  size: 4,
});

function main() {
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

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file === "ja4.motbin") continue;

    if (charCode && !file.includes(charCode)) continue;

    // Generate output file name: e.g. 'grl.motbin' => 'output/grl.txt'
    const base = file.replace(/\.motbin$/, "");
    const animFile = `${folder}/${base}.anmbin`;
    const outputFile = `${outputFolder}/${base}.txt`;

    const buffer = fs.readFileSync(`${folder}/${file}`);
    const reader = new BinaryFileReader(buffer.buffer);
    const charId = reader.read(tk_charId);
    const someHash = reader.readUInt32(0x4);

    REACTIONS_DICT = buildReactionsDictionary(reader);
    FORCED_DICT = buildForcedMovesDictionary(reader);

    // Print to console for progress monitoring
    console.log(
      `Extracting: ${file} [${charId}] -> ${outputFile}. ${someHash}`,
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

    const animKeysArray = readAnims(animFile);
    // const animKeysArray = [];
    readMoves(reader, charId, animKeysArray);

    // Cleanup and restore
    outStream.end();
    global.print = console.log;
    global.printf = function (...args) {
      process.stdout.write(args.join(""));
    };
  }
}

main();
