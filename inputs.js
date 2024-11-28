const {
  hex,
  toSignedInt32,
  getAllFiles,
  camelToTitle,
  printObject,
  sortByGameId,
} = require("./utils")

let MOVESET = {}
let LOG = true

const valueList = Array(32).fill("INVALID");
const labels = ["d/b", "d", "d/f", "b", "n", "f", "u/b", "u", "u/f", "??", "??", "??", "??", "??"];
// Assign valid labels to the first 10 indices
for (let i = 1; i <= labels.length; i++) {
  valueList[i] = labels[i - 1];
}

function getDirectionalInput(directionBits) {
  if (directionBits === 0) return "";

  const values = valueList.reduce((acc, label, index) => {
    if (directionBits & (1 << index)) {
      acc.push(label);
    }
    return acc;
  }, []);

  if (values.includes("INVALID")) {
    return "INVALID";
  }

  return values.length > 1 ? `(${values.join(" | ")})` : values[0];
}

function getCommandStr(inputBits, directionBits) {
  let inputs = ""
  let direction = ""

  // const inputBits = commandBytes >> 32
  // const directionBits = commandBytes & 0xffffffff

  const inputLabels = {
    0: "+1",
    1: "+2",
    2: "+3",
    3: "+4",
    4: "+H", // Label for Heat
    5: "+S", // Label for Special Style
    6: "+R"  // Label for Rage Art
  };

  for (let i = 0; i <= 6; i++) {
    if (inputBits & (1 << i)) {
      inputs += inputLabels[i];
    }
  }

  if (directionBits < 0x8000) {
    direction = getDirectionalInput(directionBits)
  } else if (directionBits < 0x800d) {
    const directionMap = {
      0x8000: "[AUTO]",
      0x8001: " Double tap F",
      0x8002: " Double tap B",
      0x8003: " Double tap F",
      0x8004: " Double tap B",
      0x8005: " Double tap U",
      0x8006: " Double tap D",
      0x800E: " group cancel end",
    }
    direction = directionMap[directionBits] || "UNKNOWN"
  } else if (directionBits <= 36863) {
    direction = ` input_sequence[${directionBits - 0x800f}]`
  }

  if (inputBits & (1 << 29)) {
    // If "Partial Input" mode, replace (+) with pipe (|)
    inputs = inputs[0] + inputs.slice(1).replace(/\+/g, " | ")
  }
  if (inputBits & (1 << 31)) {
    // If "directional mode" then disable command
    inputs = ""
  }

  if (!direction && inputs) {
    return inputs.slice(1);
  }

  if (!direction && !inputs) {
    return "any";
  }

  return direction + inputs;
}

function getInputs(index, count) {
  let list = []
  for (let i = 0; i < count; i++) {
    const item = MOVESET.input_extradata[index + i]
    const command = item.u2
    const direction = item.u1
    list.push(getCommandStr(command, direction))
  }
  return list
}

function processInputs() {
  MOVESET.input_sequences.forEach((sequence, i) => {
    const inputs = getInputs(sequence.extradata_idx, sequence.u2)
    if (LOG) {
      console.log(`Sequence # ${i} (${hex(i + 0x800f, 4)}) : ${inputs.join(" > ")}`)
    }
  })
}

function main() {
  sortByGameId(getAllFiles()).forEach(path => {
    const moveset = require(path)
    // if (moveset.character_id !== 6) return
    if (LOG) {
      console.log(moveset.tekken_character_name, "-", moveset.character_id)
    }
    MOVESET = moveset
    processInputs()
  })
}

main()
