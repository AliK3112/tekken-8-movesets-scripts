const { hex } = require("./utils");

// const size = 0x1B7E0;
const TOTAL = 0x36FC;
const knownFields = [
  { name: "visibility", offset: 0x8, size: 1, type: "bool" },
  { name: "_0x9", offset: 0x9, size: 1, type: "bool" },
  { name: "_0xA", offset: 0xA, size: 1, type: "bool" },
  { name: "_0xB", offset: 0xB, size: 1, type: "bool" },
  { name: "chara_id", offset: 0x168 },
  { name: "chara_id2", offset: 0x16C },
  { name: "curr_move_frame_counter", offset: 0x370 },
  { name: "curr_move_addr", offset: 0x3B8, size: 8, type: "tk_move*" },
  { name: "curr_move_addr2", offset: 0x3C0, size: 8, type: "tk_move*" },
  { name: "curr_move_id", offset: 0x528 },
  { name: "curr_move_recovery", offset: 0x5B4 },
  { name: "next_move_addr", offset: 0x1F30, size: 8, type: "tk_move*" },
  { name: "devil_flag", offset: 0x1240 },
  { name: "perma_devil_flag", offset: 0x1244 },
  { name: "moveset_addr1", offset: 0x2F48, size: 8, type: "tk_moveset*" },
  { name: "moveset_addr2", offset: 0x2F50, size: 8, type: "tk_moveset*" },
  { name: "moveset_addr3", offset: 0x2F58, size: 8, type: "tk_moveset*" },
  { name: "moveset_addr4", offset: 0x2F60, size: 8, type: "tk_moveset*" },
  { name: "moveset_addr5", offset: 0x2F68, size: 8, type: "tk_moveset*" },
  { name: "opponent_ptr", offset: 0x2F70, size: 8, type: "tk_player*" },
]

function getAttributes(offset) {
  const fieldName = "_" + hex(offset, 1)
  const type = "unsigned int"
  const size = 4
  const attributes = knownFields.find(x => x.offset === offset) || {}
  return { name: fieldName, offset, size, type, ...attributes }
}

function main() {

  console.log("struct tk_player {")
  let offset = 0;
  while (offset < TOTAL) {
    const { name, type, size } = getAttributes(offset);

    console.log(`\t${type} ${name};`);
    offset += size;
  }
  console.log("};")
}

main()
