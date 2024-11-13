const { getAllFiles, hex, printInOrder, printObject } = require("./utils")

function getAllValues(property) {
  const allValues = {}

  const fn = moveset => {
    const values = []
    moveset.moves.forEach((move, idx) => {
      move[property] !== 0 && values.push(move[property])
    })
    return values
  }

  getAllFiles().forEach(path => {
    const moveset = require(`./${path}`)
    console.log(moveset.tekken_character_name, "-", moveset.character_id)
    fn(moveset).forEach(value => {
      if (allValues[value]) {
        allValues[value]++
      } else {
        allValues[value] = 1
      }
    })
  })

  console.log(`Total ${property} values:`, Object.keys(allValues).length)
  printInOrder(allValues, false)
  // printObject(allValues);
}

function getAllVulnValues() {
  getAllValues("vuln")
}

function getAllHitLevels() {
  getAllValues("hitlevel")
}

function countMoveKeys(property = "name_key") {
  getAllFiles().forEach(path => {
    const keyFrequency = {}

    const moveset = require(`./${path}`)
    console.log(moveset.tekken_character_name, "-", moveset.character_id)
    moveset.moves.forEach(move => {
      const key = move[property]
      if (keyFrequency[key]) {
        keyFrequency[key]++
      } else {
        keyFrequency[key] = 1
      }
    })

    printInOrder(keyFrequency, false)
  })
}

function padString(str, length) {
  // Pad the string on both sides with spaces until it reaches the specified length
  return str.padStart((str.length + length) / 2).padEnd(length);
}

function padRight(str, length) {
  // Pad the string on the right side with spaces until it reaches the specified length
  return str.toString().padEnd(length, ' ');
}

function processAliases() {
  const fn = (moveset) => {
    moveset.original_aliases.forEach((alias, idx) => {
      console.log(hex(0x8000 + idx, 4), alias)
    })
  }

  getAllFiles().forEach(path => {
    const moveset = require(`./${path}`)
    // console.log(moveset.tekken_character_name, "-", moveset.character_id)
    console.log(padRight(moveset.tekken_character_name, 24), "-", padRight(moveset.character_id, 4), moveset.unknown_aliases.slice(0, -4).map((x) => hex(x, 4)).join(' '))
    // fn(moveset)
  })
} 

function main() {
  // getAllVulnValues()
  // getAllHitLevels()
  // countMoveKeys('_0xAC')
  // getAllValues('u15');
  // processAliases();
  const obj = {}
  getAllFiles().forEach((path) => {
    const moveset = require(`./${path}`)
    console.log(moveset.tekken_character_name, "-", moveset.character_id)
    obj[moveset.character_id] = moveset.tekken_character_name
  })
  console.log(obj)
}

main()
