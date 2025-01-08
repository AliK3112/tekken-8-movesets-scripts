const BYTES = 0x1dae0
const SIZE = BYTES / 8;

const sizeMapper = {
  byte: 1,
  _WORD: 2,
  _DWORD: 4,
  int: 4,
  ptr: 8,
  tk_encrypted: 16,
};

const TYPES = {
  BYTE: "byte",
  WORD: "_WORD",
  DWORD: "_DWORD",
  MOVE: "tk_move",
  MOVESET: "tk_moveset",
  PLAYER: "tk_player",
  ENCRYPTED: "tk_encrypted",
};

const KNOWN_FIELDS = [
  { name: "visible", offset: 0x8, type: TYPES.BYTE },
  { offset: 0x9, type: TYPES.BYTE },
  { offset: 0xa, type: TYPES.BYTE },
  { offset: 0xb, type: TYPES.BYTE },
  { name: "charId", offset: 0x168 },
  { name: "charId2", offset: 0x16c },
  { name: "currentMove", offset: 0x3b8, type: TYPES.MOVE, ptr: true },
  { name: "currentMove2", offset: 0x3c0, type: TYPES.MOVE, ptr: true },
  { name: "currentSpeed", offset: 0x420 },
  { name: "currentMoveId", offset: 0x528 },
  { name: "kazuyaPermaDevil", offset: 0x1290 },
  { name: "kazuyaDevil", offset: 0x1294 },
  { name: "heihachiWarrior", offset: 0x130c },
  { name: "charaInstalls", offset: 0x12C0, type: TYPES.ENCRYPTED },
  { name: "shortFlags1", offset: 0x1330, arrSize: 100, type: TYPES.WORD },
  { name: "intFlags1", offset: 0x13f8, arrSize: 50, type: TYPES.DWORD },
  { name: "nextMove", offset: 0x22f0, type: TYPES.MOVE, ptr: true },
  { name: "currentHealth", offset: 0x3280, type: TYPES.ENCRYPTED },
  { name: "totalHealth", offset: 0x3290, type: TYPES.ENCRYPTED },
  { name: "startingHealth", offset: 0x32A0, type: TYPES.ENCRYPTED },
  { name: "currentHealthPerc", offset: 0x32D8, type: TYPES.ENCRYPTED },
  { name: "parentMoveset", offset: 0x3308, type: TYPES.MOVESET, ptr: true },
  { name: "currentMoveset1", offset: 0x3310, type: TYPES.MOVESET, ptr: true },
  { name: "currentMoveset2", offset: 0x3318, type: TYPES.MOVESET, ptr: true },
  { name: "currentMoveset3", offset: 0x3320, type: TYPES.MOVESET, ptr: true },
  { name: "currentMoveset4", offset: 0x3328, type: TYPES.MOVESET, ptr: true },
  { name: "opponent", offset: 0x3330, type: TYPES.PLAYER, ptr: true },
];

const print = (...args) => console.log(...args);

const hex = (number, length = 8) =>
  "0x" + parseInt(number).toString(16).padStart(length, "0").toUpperCase();

function main() {
  print("struct tk_player {");
  for (let offset = 0; offset < SIZE;) {
    const field = KNOWN_FIELDS.find((x) => x.offset === offset) ?? { offset };
    const name = field.name ?? `_${hex(field.offset, 1)}`;
    const type = field.type || TYPES.DWORD;
    print(`\t${type}${field.ptr ? "*" : ""} ${name}${field.arrSize ? `[${field.arrSize}]` : ""};`);
    offset += sizeMapper[field.ptr ? "ptr" : type] * (field.arrSize || 1);
  }
  print("};");
}

main();
