const { getAllFiles, hex, printInOrder, printObject } = require("./utils")

function getAllCancelOptions(moveset) {
  const cancelOptions = new Set()

  const gatherCancelOptions = cancelArray => {
    cancelArray.forEach(cancel => {
      cancelOptions.add(cancel.cancel_option)
    })
  }

  gatherCancelOptions(moveset.cancels)
  gatherCancelOptions(moveset.group_cancels)

  return Array.from(cancelOptions)
}

function readingCancelExtradatas(moveset, key = 'extradata_idx') {
  const results = {}
  moveset.cancels.forEach(cancel => {
    const value =
      key === "extradata_idx"
        ? moveset.cancel_extradata[cancel[key]]
        : cancel[key]
    results[value] = (results[value] || 0) + 1
  })
  return results
}

function readAllCancelExtradatas() {
  const allResults = {}
  getAllFiles().forEach(path => {
    const moveset = require(`./${path}`)
    console.log(moveset.tekken_character_name, "-", moveset.character_id)
    const results = readingCancelExtradatas(moveset)
    Object.entries(results).forEach(([key, value]) => {
      if (allResults[key]) {
        allResults[key] += value
      } else {
        allResults[key] = value
      }
    })
  })
  printObject(allResults, false)
}

function main() {
  readAllCancelExtradatas()
}

main()
