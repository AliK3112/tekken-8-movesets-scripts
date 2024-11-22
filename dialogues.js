const { getAllFiles, sortByGameId, toSignedInt32, hex, getCharacterName } = require("./utils")

const END_REQ = 1100
let MOVESET = {}
let LOG = true

const print = (...args) => console.log(...args)

const padL = (val, len = 5) => val.toString().padStart(len, ' ')
const padR = (val, len = 5) => val.toString().padEnd(len, ' ')

const typeMapping = {
  0: 'Intro',
  1: 'Outro',
  2: 'Fate'
}

const reqMapping = {
  220: 'Player',
  221: 'Not Player',
  222: 'Opponent',
  223: 'Not Opponent',
  224: 'Player',
  225: 'Not Player',
  226: 'Opponent',
  227: 'Not Opponent',
  667: 'Story Mode',
  668: 'Story Fight',
  755: 'Player?',
  766: 'Episode Pre-fight',
  767: 'Episode Post-fight',
  801: 'Story DLC Mode',
  802: 'Story DLC Fight',
}

const characterReqs = [220, 221, 222, 223, 224, 225, 226, 227, 755];

const getMainStoryFightId = (battleId) => {
  const highNibble = (battleId & 0xF0) >> 4;
  const lowNibble = battleId & 0x0F;
  return `${highNibble}-${lowNibble}`;
}

const getDlcStoryFightId = (battleId) => {
  if (battleId === 0x804) return '8-3';
  const highByte = (battleId & 0xFF00) >> 8;
  let lowByte = battleId & 0x00FF;
  lowByte = lowByte - Math.floor(lowByte / 2);
  return `${highByte}-${lowByte}`;
}

function getRequirements(reqIdx) {
  const reqList = []
  if (reqIdx === -1) return reqList

  for (let currentIdx = reqIdx; true; currentIdx++)
  {
    const requirement = MOVESET.requirements[currentIdx]
    if (requirement.req === END_REQ || currentIdx >= MOVESET.requirements.length) {
      break;
    }
    reqList.push(requirement)
  }

  return reqList
}

function makeReqsMessage(requirements) {
  const string = requirements.reduce((acc, requirement) => {
    const { req, param } = requirement
    if (req) {
      let reqMsg = req >= 0x8000 ? hex(req, 4) : req
      reqMsg = reqMapping[req] ?? req

      let paramMsg = param
      if (characterReqs.includes(req)) {
        paramMsg = getCharacterName(param).slice(1, -1)
      } else if (req === 668) {
        paramMsg = getMainStoryFightId(param)
      } else if (req === 802) {
        paramMsg = getDlcStoryFightId(param)
      }
      acc.push(`(${reqMsg}, ${paramMsg})`)
    }
    return acc
  }, [])
  return string.length ? string.join(', ') : 'N/A'
}

function listDialogues() {
  MOVESET.dialogues.forEach((dialog, i) => {
    const type = typeMapping[dialog.type]
    const id = dialog.id
    const vclip = dialog.voiceclip_key
    const animIdx = toSignedInt32(dialog.facial_anim_idx)
    const requirements = getRequirements(dialog.requirement_idx)
    const msg1 = `${padR(type)} ${padL(id, 3)} ${hex(vclip)} ${padL(animIdx, 4)}`
    const msg2 = makeReqsMessage(requirements)
    print(`  ${msg1} - ${msg2}`)
  })
}

function main() {
  sortByGameId(getAllFiles()).forEach(path => {
    const moveset = require(`${path}`)
    if (LOG) {
      print(moveset.tekken_character_name, "-", moveset.character_id)
    }
    MOVESET = moveset
    listDialogues()
  })
}

main()
