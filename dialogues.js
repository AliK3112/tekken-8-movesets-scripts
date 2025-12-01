const fs = require("fs");
const BinaryFileReader = require("./binaryFileReader");
const {
  CODE_MAPPING,
  getAllFiles,
  sortByGameId,
  toSignedInt32,
  hex,
  getCharacterName,
} = require("./utils");

const END_REQ = 1100;
let MOVESET = {};
let LOG = true;

const print = (...args) => console.log(...args);
const printf = (...args) => process.stdout.write(args.join(" "));
const printn = (num, length = 5) => num.toString().padStart(length, " ");

const padL = (val, len = 5) => val.toString().padStart(len, " ");
const padR = (val, len = 5) => val.toString().padEnd(len, " ");

const typeMapping = {
  0: "Intro",
  1: "Outro",
  2: "Fate",
};

const reqMapping = {
  220: "Player",
  221: "Not Player",
  222: "Opponent",
  223: "Not Opponent",
  224: "Player",
  225: "Not Player",
  226: "Opponent",
  227: "Not Opponent",
  667: "Story Mode",
  668: "Story Fight",
  755: "Player?",
  766: "Episode Pre-fight",
  767: "Episode Post-fight",
  801: "Story DLC Mode",
  802: "Story DLC Fight",
  804: "Side",
};

const characterReqs = [220, 221, 222, 223, 224, 225, 226, 227, 755];

const tk_charId = (c) => ({
  value: (c.readInt32(0x160) - 1) / 0xffff,
  size: 4,
});

const getMainStoryFightId = (battleId) => {
  const highNibble = (battleId & 0xf0) >> 4;
  const lowNibble = battleId & 0x0f;
  return `${highNibble}-${lowNibble}`;
};

const getDlcStoryFightId = (battleId) => {
  if (battleId === 0x804) return "8-3";
  const highByte = (battleId & 0xff00) >> 8;
  let lowByte = battleId & 0x00ff;
  lowByte = lowByte - Math.floor(lowByte / 2);
  return `${highByte}-${lowByte}`;
};

function getRequirements(reqIdx) {
  const reqList = [];
  if (reqIdx === -1) return reqList;

  for (let currentIdx = reqIdx; true; currentIdx++) {
    const requirement = MOVESET.requirements[currentIdx];
    if (
      requirement.req === END_REQ ||
      currentIdx >= MOVESET.requirements.length
    ) {
      break;
    }
    reqList.push(requirement);
  }

  return reqList;
}

function createReqMessage(req, param) {
  if (!req) return "";
  let reqMsg = req >= 0x8000 ? hex(req, 4) : req;
  reqMsg = reqMapping[req] ?? reqMsg;
  let paramMsg = param;
  if (characterReqs.includes(req)) {
    paramMsg = getCharacterName(param).slice(1, -1);
  } else if (req === 668) {
    paramMsg = getMainStoryFightId(param);
  } else if (req === 802) {
    paramMsg = getDlcStoryFightId(param);
  } else if (req === 804) {
    paramMsg = param === 1 ? "Left" : "Right";
  }
  return `(${reqMsg}, ${paramMsg})`;
}

function makeReqsMessage(requirements) {
  const string = requirements.reduce((acc, requirement) => {
    const { req, param } = requirement;
    if (req) {
      acc.push(createReqMessage(req, param));
    }
    return acc;
  }, []);
  return string.length ? string.join(", ") : "N/A";
}

function listDialogues() {
  MOVESET.dialogues.forEach((dialog, i) => {
    const type = typeMapping[dialog.type];
    const id = dialog.id;
    const vclip = dialog.voiceclip_key;
    const animIdx = toSignedInt32(dialog.facial_anim_idx);
    const requirements = getRequirements(dialog.requirement_idx);
    const msg1 = `${padR(type)} ${padL(id, 3)} ${hex(vclip)} ${padL(
      animIdx,
      4
    )}`;
    const msg2 = makeReqsMessage(requirements);
    print(`  ${msg1} - ${msg2}`);
  });
}

const getStart = (reader, offset) => Number(reader.readUInt64(offset)) + 0x318;
const getCount = (reader, offset) => Number(reader.readUInt64(offset));

/**
 * @param {BinaryFileReader} reader
 * @param {number} reqIdx
 */
function getRequirements(reader, reqIdx) {
  const start = getStart(reader, 0x180);
  const count = getCount(reader, 0x188);

  if (reqIdx < 0 || reqIdx >= count) return "N/A";

  const values = [];
  for (let i = reqIdx; i < count; i++) {
    const addr = start + i * 20;
    const req = reader.readInt32(addr);
    const param = reader.readInt32(addr + 4);

    if (req === 1100) break;

    // const [req, ...params] = [0, 1, 2, 3, 4].map(off => reader.readInt32(addr + off * 4));
    if (req) {
      values.push(createReqMessage(req, param));
    }
  }
  return values.length ? values.join(", ") : "N/A";
}

/**
 * @param {BinaryFileReader} reader
 */
function processFile(reader) {
  const dlgStart = getStart(reader, 0x2a0);
  const dlgCount = getCount(reader, 0x2a8);

  // const dict = require("./name_keys.json");
  // dict[0x88e3ee99] = "None";
  const dict = {};

  for (let i = 0; i < dlgCount; i++) {
    const addr = dlgStart + i * 24;
    const type = typeMapping[reader.readUInt16(addr)];
    const id = reader.readUInt16(addr + 2);
    const vclip = reader.readUInt32(addr + 16);
    const fanm = reader.readInt32(addr + 20);
    const reqIdx = Number(reader.readUInt64(addr + 8));
    printf(`Entry # ${printn(i + 1, 3)} |`);
    printf(` Type: ${printn(type)} |`);
    printf(` ID: ${printn(id, 3)} |`);
    if (dict[vclip]) {
      printf(` CLIP: ${printn(dict[vclip], 25)} |`);
    } else {
      printf(` CLIP: ${printn(hex(vclip), 10)} |`);
    }
    printf(` ANM: ${printn(fanm, 3)} |`);
    printf(` Requirements: ${getRequirements(reader, reqIdx)}`);
    // printf(` REQ_IDX: ${reqIdx}`);
    print();
  }
  print();
}

function main() {
  const folder = "./Binary/mothead/bin";
  const files = fs
    .readdirSync(folder)
    .filter((file) => file.endsWith(".motbin"));
  const fn = (x) => x.replace(".motbin", "");
  files.sort((a, b) => CODE_MAPPING[fn(a)] - CODE_MAPPING[fn(b)]);

  files.forEach((path) => {
    if (path === "ja4.motbin") return;

    // if (path !== "ant.motbin") return;

    const buffer = fs.readFileSync(`${folder}/${path}`);
    const reader = new BinaryFileReader(buffer.buffer);
    if (LOG) {
      const charId = reader.read(tk_charId);
      print(path, getCharacterName(charId), "-", charId);
      // const code = path.replace(".motbin", "");
      // print(`"${code}": ${charId},`);
    }
    processFile(reader);
    // MOVESET = moveset
    // listDialogues()
  });
}

main();

/**
 * Voiceclip column stores the hashed name of the VC file to play
 * E.g,
 * 0x71d4e96e = fate_grl_amlvsgrl_00
 * 0x86438dfb = grl_w00
 * 0x2b139430 = grl_s02_vr00
 * 0x88e3ee99 = None
 */