const { pick, map, has } = require("lodash")
const { hex, toSignedInt32, getAllFiles, camelToTitle, printObject } = require("./utils")

const END_REQ = 1100
let TARGET_REQ = 0
let MOVESET = {}
let MOVE_ID = -1
let PARAMETERS = {}
let LOG = true

function addParameter(param) {
  PARAMETERS[param] ??= 0
  PARAMETERS[param]++
}

// Helper function to process a single property
function processProp(prop, propIndex, results, key) {
  processRequirements(prop.requirement_idx, propIndex, results, key)
  return prop.id !== 0 && prop.id !== END_REQ;
}


// Helper function to process properties for a specific move
function processMoveProps(propIdx, propsArr, results, key) {
  const startIdx = propIdx;
  if (startIdx === -1) return; // No properties for this move
  let currentIdx = startIdx;

  while (processProp(propsArr[currentIdx], currentIdx, results, key)) {
    currentIdx++;
  }
}

function processRequirements(reqIdx, itemIdx, results, itemKey, parentIdx = -1, parentKey = '') {
  if (reqIdx === -1) return;
  const moveset = MOVESET;
  const moveId = MOVE_ID;

  for (let currentIdx = reqIdx; currentIdx < moveset.requirements.length; currentIdx++) {
    const requirement = moveset.requirements[currentIdx];
    if (requirement.req === TARGET_REQ) {
      results.push({
        moveId,
        itemKey,
        itemIdx,
        index: currentIdx,
        ...(parentKey && parentIdx !== -1 && { parentKey, parentIdx }),
        values: map(pick(requirement, 'param', 'param2', 'param3', 'param4')).filter(Boolean),
      });
      addParameter(requirement.param);
    }
    if (requirement.req === END_REQ) break;
  }
}

function processCancels(cancelIdx, results) {
  if (cancelIdx === -1) return;
  const moveset = MOVESET;

  for (let currentIdx = cancelIdx; currentIdx < moveset.cancels.length; currentIdx++) {
    const cancel = moveset.cancels[currentIdx];
    if (cancel.command !== 0x800d) { // Not a group cancel
      processRequirements(cancel.requirement_idx, currentIdx, results, 'cancelIdx');
    } else {
      for (let gCancelIdx = cancel.move_id; gCancelIdx < moveset.group_cancels.length; gCancelIdx++) {
        const groupCancel = moveset.group_cancels[gCancelIdx];
        if (groupCancel.command === 0x800e) break; // end of group cancel
        processRequirements(groupCancel.requirement_idx, gCancelIdx, results, 'groupCancelIdx', cancelIdx, 'cancelIdx');
      }
    }
    if (cancel.command === 0x8000) break;
  }
}

function processHitConditions(condIdx, results) {
  if (condIdx === -1) return
  let currentIdx = condIdx

  const isEnd = (hitCondition) => {
    const req = MOVESET.requirements[hitCondition.requirement_idx]
    return (req === END_REQ)
  }

  let hitCondition
  do {
    hitCondition = MOVESET.hit_conditions[currentIdx]
    processRequirements(hitCondition.requirement_idx, condIdx, results, 'hitConditionIdx')
    currentIdx++
  } while (isEnd(hitCondition) || currentIdx > MOVESET.hit_conditions.length)
}

function processDialogues(results) {
  // let currentIdx = move.extra_properties_idx
  // while (true) {
  //   const prop = MOVESET.extra_move_properties[currentIdx]
  //   if (prop.id === 0) break
  //   currentIdx++
  // }
  const dialogues = has(MOVESET, '_0x298') ? MOVESET._0x298 : MOVESET.dialogues;
  dialogues.forEach((dialogue, i) => {
    processRequirements(dialogue.requirement_idx, i, results, 'dialogIdx')
  })
}

function findRequirement() {
  const results = {
    extraProps: [],
    startProps: [],
    endProps: [],
    hitConditions: [],
    cancels: [],
    dialogues: [],
  };

  MOVESET.moves.forEach((move, moveId) => {
    MOVE_ID = moveId
    processCancels(move.cancel_idx, results.cancels)
    processMoveProps(move.extra_properties_idx, MOVESET.extra_move_properties, results.extraProps, 'extraPropIdx')
    processMoveProps(move.move_start_properties_idx, MOVESET.move_start_props, results.startProps, 'startPropIdx')
    processMoveProps(move.move_end_properties_idx, MOVESET.move_end_props, results.endProps, 'endPropIdx')
    processHitConditions(move.hit_condition_idx, results.hitConditions)
  })
  MOVE_ID = 'N/A'
  processDialogues(results.dialogues)

  if (LOG) {
    logResults("Cancels", results.cancels)
    logResults("Extraprops", results.extraProps)
    logResults("StartProps", results.startProps)
    logResults("EndProps", results.endProps)
    logResults("HitConditions", results.hitConditions)
    logResults("Dialogues", results.dialogues)
  }
}

const pad = (num, len = 5) => num.toString().padStart(len, ' ')

const get = (result) => {
  const parent = result.parentKey && result.parentIdx ? `${camelToTitle(result.parentKey)}: ${pad(result.parentIdx)} ` : ''
  return `${parent}${camelToTitle(result.itemKey)}: ${pad(result.itemIdx)}`;
}

// Helper function to log results
function logResults(propType, results) {
  if (results.length) {
    console.log(`Requirement ${TARGET_REQ} found in ${propType}:`);
    results.forEach(result => {
      const logMessage = `  Move ${pad(result.moveId)}, ${get(result)} Req index: ${pad(result.index)}`;
      const valueMessage = result.values.map((val, i) => `Value ${i + 1}: ${val}`).join(" ")
      console.log(`${logMessage}, ${valueMessage}`);
    });
  } else {
    console.log(`No Requirement ${TARGET_REQ} found in ${propType}`);
  }
}

function main() {
  const args = process.argv.slice(2);

  args.forEach(arg => {
    if (arg.startsWith("--target=")) {
      const value = arg.split("=")[1];
      const num = parseInt(value);
      if (isNaN(num) || num < 0 || num > 1200) {
        console.error("Error: --target value must be a value between 0 and 1200.");
        process.exit(1);
      }
      TARGET_REQ = num;
    } else if (arg.startsWith("--log=")) {
      LOG = arg.split("=")[1] === 'true';
    }
  });

  if (!TARGET_REQ) {
    console.error("Error: --target is required and must be a hexadecimal between 0x8000 and 0x88FF.");
    process.exit(1);
  }

  getAllFiles().forEach((path, i) => {
    const moveset = require(`${path}`)
    // if (moveset.tekken_character_name !== '[HEIHACHI]') return;
    if (LOG) {
      console.log(moveset.tekken_character_name, "-", moveset.character_id)
    }
    MOVESET = moveset
    findRequirement()
  })
  console.log('PARAMETERS')
  printObject(PARAMETERS)
  console.log("--- Analysis Complete ---")
}

main()
