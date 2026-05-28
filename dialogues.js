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

const MULTI_OPP_PROP1 = 505; // Is Opponent
const MULTI_OPP_PROP2 = 506; // Is Not Opponent
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
  [MULTI_OPP_PROP1]: "Opponent",
  [MULTI_OPP_PROP2]: "Not Opponent",
  667: "Story Mode",
  668: "Story Fight",
  755: "Player?",
  766: "Episode Pre-fight",
  767: "Episode Post-fight",
  801: "Story DLC Mode",
  802: "Story DLC Fight",
  804: "Side",
};

const characterReqs = [220, 221, 222, 223, 224, 225, 226, 227, MULTI_OPP_PROP1, MULTI_OPP_PROP2, 755];

const tk_charId = (c) => ({
  value: (c.readInt32(0x160) - 1) / 0xffff,
  size: 4,
});

const tk_requirment = (ctx, pos) => ({
  value: {
    req: ctx.readUInt32(pos),
    param: ctx.readUInt32(pos + 4),
    param2: ctx.readUInt32(pos + 8),
    param3: ctx.readUInt32(pos + 12),
    param4: ctx.readUInt32(pos + 16),
  },
  size: 20,
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

const formatCharName = (id) => getCharacterName(id).slice(1, -1);

const PARAM_HANDLERS = {
  668: ({ param }) => getMainStoryFightId(param),
  802: ({ param }) => getDlcStoryFightId(param),
  804: ({ param }) => (param === 1 ? "Left" : "Right"),
  // Multi-character requirements
  multiChar: (reqObj) => ['param', 'param2', 'param3', 'param4']
    .map(key => reqObj[key])
    .filter(val => val !== undefined)
    .map(formatCharName)
    .join(", ")
};

function createReqMessage(requirement) {
  const { req, param } = requirement;
  if (!req) return "";

  const reqMsg = reqMapping[req] ?? (req >= 0x8000 ? hex(req, 4) : req);
  let paramMsg = param;

  if (characterReqs.includes(req)) {
    paramMsg = (req === MULTI_OPP_PROP1 || req === MULTI_OPP_PROP2)
      ? PARAM_HANDLERS.multiChar(requirement)
      : formatCharName(param);
  } else if (PARAM_HANDLERS[req]) {
    paramMsg = PARAM_HANDLERS[req](requirement);
  }

  return `(${reqMsg}, ${paramMsg})`;
}

function makeReqsMessage(requirements) {
  const string = requirements.reduce((acc, requirement) => {
    if (requirement.req) {
      acc.push(createReqMessage(requirement));
    }
    return acc;
  }, []);
  return string.length ? string.join(", ") : "N/A";
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
    const requirement = reader.read(tk_requirment, addr);

    if (requirement.req === 1100) break;
    if (requirement.req) {
      values.push(createReqMessage(requirement));
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

  const dict = require("./name_keys.json");

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
      printf(` CLIP: ${printn(hex(vclip), 25)} |`);
    }
    printf(` ANM: ${printn(fanm, 3)} |`);
    printf(` Requirements: ${getRequirements(reader, reqIdx)}`);
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
    }
    processFile(reader);
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