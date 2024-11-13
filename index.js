const { readFileSync, readdirSync } = require("fs")
const PATH = "./extracted_chars_1_08_1"

function findRequirements(moveset, targetReq, targetParam = -1) {
  const findings = {}
  const keys = ['param', 'param2', 'param3', 'param4']
  moveset.requirements.forEach((requirement, index) => {
    const { req, param } = requirement
    if (req === targetReq && (targetParam === -1 || param === targetParam)) {
      findings[index] ??= []
      keys.forEach((key) => {
        findings[index].push(requirement[key])
      })
    }
  })
  return findings
}

// Paul: 1120, 1 -> req_idx: 1958
function whichMovesUseTheseRequirements(moveset, requirementIdx) {
  const findings = {}
  for (let i = 0; i < moveset.moves.length; i++) {
    const move = moveset.moves[i]
    let cancelIdx = move.cancel_idx
    while (true) {
      const cancel = moveset.cancels[cancelIdx]
      if (cancel.requirement_idx === requirementIdx) {
        findings[i] ??= []
        findings[i].push(cancelIdx - move.cancel_idx)
      }
      cancelIdx++
      if (cancelIdx >= moveset.cancels.length || cancel.command === 0x8000) {
        break
      }
    }
  }
  console.log('moves:', findings)
}

const getKey = (id) => `0x${id.toString(16).padStart(4, "0")}`

const printProps = (props) => {
  for (const key in props) {
    console.log(getKey(+key), props[key])
  }
}

function getAllExtraprops(moveset) {
  const findings = {}

  const getMapper = (key) => {
    return (item) => {
      const value = item[key]
      if (value >= 0x8000) {
        findings[value] ??= 0
        findings[value]++
      }
    }
  }

  moveset.extra_move_properties.forEach(getMapper('id'))
  moveset.requirements.forEach(getMapper('req'))
  moveset.move_start_props.forEach(getMapper('id'))
  moveset.move_end_props.forEach(getMapper('id'))
  // printProps(findings)
  return findings
}

function studyMoves(moveset) {
  const result = {}
  // moveset.moves.forEach((move, i) => {
  //   console.log(
  //     i,
  //     // hex(move._0x60),
  //     hex(move.ordinal_id),
  //     hex(move.name_key),
  //     hex(move.anim_key),
  //     hex(move.anim_addr_enc1),
  //     // hex(move.anim_addr_enc2),
  //   )
  // })
  // moveset.parry_related.forEach((value) => {
  //   console.log(hex(value))
  // })
  return result
}

function getAllCancelOptions(moveset) {
  const cancelOptions = new Set();

  const gatherCancelOptions = (cancelArray) => {
    cancelArray.forEach(cancel => {
      cancelOptions.add(cancel.cancel_option);
    });
  };

  gatherCancelOptions(moveset.cancels);
  gatherCancelOptions(moveset.group_cancels);

  return Array.from(cancelOptions);
}


function main() {
  const folders = readdirSync(PATH)
  const allFindings = {}

  for (const folder of folders) {
    if (folder === ".DS_Store") continue
    const moveset = require(`${PATH}/${folder}/${folder}.json`)
    console.log(moveset.tekken_character_name, moveset.character_id)
    // const cancelOptions = getAllCancelOptions(moveset);
    // allFindings.push(...cancelOptions)
    // if (moveset.tekken_character_name === "[DEVIL_JIN_2]") {
    //   studyMoves(moveset)
    // }
    // studyMoves(moveset)
    // const requirements = findRequirements(moveset, 506)
    // console.log(requirements)
    // whichMovesUseTheseRequirements(moveset, 1958)
    const findings = getAllExtraprops(moveset)
    for (const key in findings) {
      allFindings[key] ??= 0
      allFindings[key] += findings[key]
    }
  }
  // console.log('--- Analysis Complete ---')
  // const uniqueFindings = [...new Set(allFindings)];
  // console.log(uniqueFindings.sort((a, b) => a - b))
  // printProps(allFindings)
  // console.log(Object.keys(allFindings).length)
  
  // Step 1: Convert the object into an array of key-value pairs
  const entries = Object.entries(allFindings)

  // Step 2: Sort the array by the values (item[1]) in descending order
  const sortedEntries = entries.sort((a, b) => b[1] - a[1])

  // Step 3: Convert the sorted array back into an object (optional)
  const sortedHexObject = Object.fromEntries(sortedEntries)

  // console.log(sortedEntries)
  sortedEntries.forEach(([key, value]) => {
    console.log(getKey(+key), value)
  })
}

main()
