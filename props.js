const { pick, map } = require("lodash")
const { hex, toSignedInt32, getAllFiles, sortByGameId, printObject } = require("./utils")

const END_REQ = 1100
let TARGET_PROP = 0
let MOVESET = {}
let PARAMETERS = {}
let LOG = true

function addParameter(param) {
  PARAMETERS[param] ??= 0
  PARAMETERS[param]++
}

function getAllExtraprops(moveset) {
  const findings = {}

  const processItem = (item, key) => {
    const value = item[key]
    if (value >= 0x8000) {
      findings[value] = (findings[value] || 0) + 1
    }
  }

  const processArray = (array, key = "id") => {
    array.forEach(item => processItem(item, key))
  }

  processArray(moveset.extra_move_properties)
  processArray(moveset.requirements, "req")
  processArray(moveset.move_start_props)
  processArray(moveset.move_end_props)

  return findings
}

// Helper function to process a single property
function processProp(prop, moveId, propIndex, isExtraprop, results) {
  if (prop.id === TARGET_PROP) {
    results.push({
      moveId,
      propIndex,
      ...(isExtraprop && { propType: prop.type }),
      values: map(pick(prop, 'value', 'value2', 'value3', 'value4', 'value5')).filter(Boolean),
    });
    addParameter(prop.value);
  }
  return prop.id !== 0 && prop.id !== END_REQ;
}

// Helper function to process properties for a specific move
function processMoveProps(propIdx, moveId, propsArr, results, isExtraprop = false) {
  const startIdx = propIdx;
  if (startIdx === -1) return; // No properties for this move

  let currentIdx = startIdx;

  while (processProp(propsArr[currentIdx], moveId, currentIdx, isExtraprop, results)) {
    currentIdx++;
  }
}

function processRequirements(reqIdx, cancelIdx, moveId, moveset, results, isCancel = false) {
  if (reqIdx === -1) return;

  for (let currentIdx = reqIdx; currentIdx < moveset.requirements.length; currentIdx++) {
    const requirement = moveset.requirements[currentIdx];
    if (requirement.req === TARGET_PROP) {
      results.push({
        moveId,
        [isCancel ? 'cancelIdx' : 'cancelIdx']: cancelIdx,
        propIndex: currentIdx,
        values: map(pick(requirement, 'param', 'param2', 'param3', 'param4')).filter(Boolean),
      });
      addParameter(requirement.param);
    }
    if (requirement.req === END_REQ) break;
  }
}

function findPropsInCancels(cancelIdx, moveId, moveset, results) {
  if (cancelIdx === -1) return;

  for (let currentIdx = cancelIdx; currentIdx < moveset.cancels.length; currentIdx++) {
    const cancel = moveset.cancels[currentIdx];
    if (cancel.command !== 0x800d) { // Not a group cancel
      processRequirements(cancel.requirement_idx, currentIdx, moveId, moveset, results, true);
    } else {
      for (let gCancelIdx = cancel.move_id; gCancelIdx < moveset.group_cancels.length; gCancelIdx++) {
        const groupCancel = moveset.group_cancels[gCancelIdx];
        if (groupCancel.command === 0x800e) break; // end of group cancel
        processRequirements(groupCancel.requirement_idx, currentIdx, moveId, moveset, results, true);
      }
    }
    if (cancel.command === 0x8000) break;
  }
}

function findAllPropIndexes(moveset) {
  const results = {
    extraProps: [],
    startProps: [],
    endProps: [],
    cancels: [],
  };

  moveset.moves.forEach((move, moveId) => {
    processMoveProps(move.extra_properties_idx, moveId, moveset.extra_move_properties, results.extraProps, true);
    processMoveProps(move.move_start_properties_idx, moveId, moveset.move_start_props, results.startProps);
    processMoveProps(move.move_end_properties_idx, moveId, moveset.move_end_props, results.endProps);
    findPropsInCancels(move.cancel_idx, moveId, moveset, results.cancels);
  });

  return results;
}

const pad = (num, len = 5) => num.toString().padStart(len, ' ')

// Helper function to log results
function logResults(propType, results) {
  if (results.length) {
    console.log(`${propType} ${hex(TARGET_PROP, 4)} found in:`);
    results.forEach(result => {
      const logMessage = `  Move ${pad(result.moveId)}, ${propType} index: ${pad(result.propIndex)}`;
      // const valueMessage = ` Value: ${hex(result.value)}`
      const valueMessage = result.values.map((val, i) => `Value ${i + 1}: ${hex(val)}`).join(" ")
      console.log(
        result.propType
          ? `${logMessage}, Frame: ${pad(result.propType)}, ${valueMessage}`
          : result.cancelIdx
          ? `${logMessage}, Cancel Idx: ${pad(result.cancelIdx)}, ${valueMessage}`
          : `${logMessage}, ${valueMessage}`
      )
    });
  }
}

function findExtraprops(moveset) {
  const allResults = findAllPropIndexes(moveset);
  
  if (LOG) {
    logResults("Extraprop", allResults.extraProps);
    logResults("Start prop", allResults.startProps);
    logResults("End prop", allResults.endProps);
    logResults("Requirement", allResults.cancels);
  }
}

function collectAllExtraprops(folders) {
  const allFindings = {}

  const files = getAllFiles();
  sortByGameId(files);
  files.forEach((path) => {
    const moveset = require(`./${path}`)
    console.log(moveset.character_id, '-', moveset.tekken_character_name)
    const findings = getAllExtraprops(moveset)
    for (const key in findings) {
      allFindings[key] ??= 0
      allFindings[key] += findings[key]
    }
  })

  // Step 1: Convert the object into an array of key-value pairs
  const entries = Object.entries(allFindings)

  // Step 2: Sort the array by the values (item[1]) in descending order
  const sortedEntries = entries.sort((a, b) => b[1] - a[1])

  // Step 3: Print
  sortedEntries.forEach(([key, value]) => {
    console.log(hex(+key, 4), value)
  })
}

function main() {
  const args = process.argv.slice(2);

  args.forEach(arg => {
    if (arg.startsWith("--target=")) {
      const value = arg.split("=")[1];
      const num = parseInt(value, 16);
      if (isNaN(num) || num < 0x8000 || num > 0x88FF) {
        console.error("Error: --target value must be a hexadecimal between 0x8000 and 0x88FF.");
        process.exit(1);
      }
      TARGET_PROP = num;
    } else if (arg.startsWith("--log=")) {
      LOG = arg.split("=")[1] === 'true';
    }
  });
  
  if (!TARGET_PROP) {
    console.error("Error: --target is required and must be a hexadecimal between 0x8000 and 0x88FF.");
    process.exit(1);
  }

  const files = getAllFiles();
  sortByGameId(files);

  files.forEach((path) => {
    const moveset = require(`./${path}`)
    MOVESET = moveset // global assigning
    if (LOG) {
      console.log(moveset.tekken_character_name, "-", moveset.character_id)
    }
    findExtraprops(moveset)
  })
  console.log('PARAMETERS')
  printObject(PARAMETERS)
  console.log("--- Analysis Complete ---")
}

main()
