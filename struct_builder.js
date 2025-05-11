const BYTES = 0x1dae0
const SIZE = BYTES / 8;

const MOVESET_OFFSET = 0x3538;

const sizeMapper = {
  byte: 1,
  _WORD: 2,
  _DWORD: 4,
  int: 4,
  ptr: 8,
  tk_encrypted: 16,
  tk_anim_related_struct: 0x30,
};

const TYPES = {
  BYTE: "byte",
  WORD: "_WORD",
  DWORD: "_DWORD",
  MOVE: "tk_move",
  MOVESET: "tk_moveset",
  PLAYER: "tk_player",
  ENCRYPTED: "tk_encrypted",
  ANIMATION: "tk_anim_related_struct",
};

const KNOWN_FIELDS = [
  { name: "visible", offset: 0x8, type: TYPES.BYTE },
  { offset: 0x9, type: TYPES.BYTE },
  { offset: 0xa, type: TYPES.BYTE },
  { offset: 0xb, type: TYPES.BYTE },
  { name: "animStruct1", offset: 0x20, type: TYPES.ANIMATION, ptr: true },
  { name: "animStruct2", offset: 0x28, type: TYPES.ANIMATION, ptr: true },
  { name: "animStruct3", offset: 0x30, type: TYPES.ANIMATION, ptr: true },
  { name: "animStructPtrs", offset: 0x38, type: TYPES.ANIMATION, ptr: true, arrSize: 4 },
  { name: "charId", offset: 0x168 },
  { name: "charId2", offset: 0x16c },
  { name: "currentMove", offset: 0x3d8, type: TYPES.MOVE, ptr: true },
  { name: "currentMove2", offset: 0x3e0, type: TYPES.MOVE, ptr: true },
  { name: "currentSpeed", offset: 0x420 },
  { name: "currentMoveId", offset: 0x548 },
  { name: "kazuyaPermaDevil", offset: 0x132C },
  { name: "kazuyaDevil", offset: 0x1330 },
  // { name: "heihachiWarrior", offset: 0x130c },
  // { name: "charaInstalls", offset: 0x12C0, type: TYPES.ENCRYPTED },
  // { name: "shortFlags1", offset: 0x1330, arrSize: 100, type: TYPES.WORD },
  // { name: "intFlags1", offset: 0x13f8, arrSize: 50, type: TYPES.DWORD },
  // { name: "nextMove", offset: 0x2410, type: TYPES.MOVE, ptr: true },
  { name: "animStruct4", offset: MOVESET_OFFSET - 0x198, type: TYPES.ANIMATION },
  { name: "animStruct5", offset: MOVESET_OFFSET - 0x148, type: TYPES.ANIMATION },
  { name: "animStruct6", offset: MOVESET_OFFSET - 0xF8, type: TYPES.ANIMATION },
  { name: "currentHealth", offset: MOVESET_OFFSET - 0x88, type: TYPES.ENCRYPTED },
  { name: "totalHealth", offset: MOVESET_OFFSET - 0x78, type: TYPES.ENCRYPTED },
  { name: "startingHealth", offset: MOVESET_OFFSET - 0x68, type: TYPES.ENCRYPTED },
  { name: "currentHealthPerc", offset: MOVESET_OFFSET - 0x30, type: TYPES.ENCRYPTED },
  { name: "parentMoveset", offset: MOVESET_OFFSET, type: TYPES.MOVESET, ptr: true },
  { name: "currentMoveset1", offset: MOVESET_OFFSET + 8, type: TYPES.MOVESET, ptr: true },
  { name: "currentMoveset2", offset: MOVESET_OFFSET + 16, type: TYPES.MOVESET, ptr: true },
  { name: "currentMoveset3", offset: MOVESET_OFFSET + 24, type: TYPES.MOVESET, ptr: true },
  { name: "currentMoveset4", offset: MOVESET_OFFSET + 32, type: TYPES.MOVESET, ptr: true },
  { name: "opponent", offset: MOVESET_OFFSET + 40, type: TYPES.PLAYER, ptr: true },
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
