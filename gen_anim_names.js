const fs = require("fs");
const BinaryFileReader = require("./BinaryFileReader");
const { computeKamuiHash } = require("./hash");
const { readMovesList } = require("./utils");

const print = console.log;
const SET_SMALL = "abcdefghijklmnopqrstuvwxyz";

/* Helper to generate all combinations of a given length from chars */
function* generateSuffixes(chars, length, prefix = "") {
  if (length === 0) {
    yield prefix;
    return;
  }
  for (const c of chars) {
    yield* generateSuffixes(chars, length - 1, prefix + c);
  }
}

const tk_charId = (c) => ({
  value: (c.readInt32(0x160) - 1) / 0xffff,
  size: 4,
});

; (() => {
  const files = fs.readdirSync("./Binary/mothead/bin").filter((x) => x.endsWith(".motbin") && x !== "ja4.motbin");
  const nameKeys = require("./name_keys.json");

  for (const file of files) {
    const filePath = `./Binary/mothead/bin/${file}`;
    const code = file.replace(".motbin", "");
    if (code === "test") continue;
    // if (code !== "grl") continue;
    const buffer = fs.readFileSync(filePath);
    const reader = new BinaryFileReader(buffer.buffer);
    const charId = reader.read(tk_charId);

    print("Processing", file, charId);

    const animNameKeysSet = new Set();
    const lengthDict = {};

    const moves = readMovesList(reader);

    moves.forEach((move) => {
      lengthDict[move.anim_name_key] = move.anim_name_length;
      animNameKeysSet.add(move.anim_name_key);
    });

    const addToDict = (input) => {
      const hash = computeKamuiHash(input);
      const length = lengthDict[hash];
      if (!nameKeys[hash] && animNameKeysSet.has(hash) && length === input.length) {
        print(input, hash);
        nameKeys[hash] = input;
      }
    };

    [0, 1, 2, 3, 4, 98, 99].forEach((i) => {
      const postfix = i.toString().padStart(2, "0");
      addToDict(code + "_sta_" + postfix);
      addToDict(code + "_win_" + postfix);
      addToDict(code + "_win_" + postfix + "_y");
    })

    for (const gen of generateSuffixes(SET_SMALL, 2)) {
      addToDict(code + gen + "_co_kamae");
      addToDict(code + gen + "_co_kiai");
      addToDict(code + gen + "_at_kiai");
      addToDict(code + gen + "_co_sit");
      addToDict(code + gen + "_co_fstep");
      addToDict(code + gen + "_co_bstep");
      addToDict(code + gen + "_co_step_b");
      addToDict(code + gen + "_co_step_l");
      addToDict(code + gen + "_co_step_r");
      addToDict(code + gen + "_co_crouch");
      addToDict(code + gen + "_co_crouchf");
      addToDict(code + gen + "_co_crouchb");
      addToDict(code + gen + "_co_walkf");
      addToDict(code + gen + "_co_syagami");
      addToDict(code + gen + "_co_stand");
      addToDict(code + gen + "_co_standb");
      addToDict(code + gen + "_co_standf");
      addToDict(code + gen + "_co_turnr");
      addToDict(code + gen + "_co_turnl");

      addToDict(code + gen + "_ra_pre");
      addToDict(code + gen + "_ra_finish_f");
      addToDict(code + gen + "_ra_finish_y");
      addToDict(code + gen + "_ra_finish_ko_f");
      addToDict(code + gen + "_ra_finish_ko_y");
      addToDict(code + gen + "_ra_pre_story");
      addToDict(code + gen + "_ra_finish_story_f");
      addToDict(code + gen + "_ra_finish_story_y");

      addToDict(code + gen + "_at_drive");
      addToDict(code + gen + "_at_zd");
      addToDict(code + gen + "_at_zd_miss");
      addToDict(code + gen + "_th_zd_f");
      addToDict(code + gen + "_th_zd_y");
      addToDict(code + gen + "_th_zd_hit_f");
      addToDict(code + gen + "_th_zd_hit_y");
      addToDict(code + gen + "_at_hs");
      addToDict(code + gen + "_at_hs_miss");
      addToDict(code + gen + "_th_hs_f");
      addToDict(code + gen + "_th_hs_y");
      addToDict(code + gen + "_th_hs_hit_f");
      addToDict(code + gen + "_th_hs_hit_y");
      addToDict(code + gen + "_at_hs_hit_f");
      addToDict(code + gen + "_at_hs_hit_y");

      addToDict(code + gen + "_at_lp");
      addToDict(code + gen + "_at_rp");
      addToDict(code + gen + "_at_lk");
      addToDict(code + gen + "_at_rk");
      addToDict(code + gen + "_at_lk00");
      addToDict(code + gen + "_at_rk00");
      addToDict(code + gen + "_at_lp00");
      addToDict(code + gen + "_at_rp00");

      addToDict(code + gen + "_at_cr3lp");
      addToDict(code + gen + "_at_cr3rp");
      addToDict(code + gen + "_at_cr3lk");
      addToDict(code + gen + "_at_cr3rk");
      addToDict(code + gen + "_at_cr3wp");
      addToDict(code + gen + "_at_cr3wk");

      addToDict(code + gen + "_at_stlp");
      addToDict(code + gen + "_at_strp");
      addToDict(code + gen + "_at_stlk");
      addToDict(code + gen + "_at_strk");
      addToDict(code + gen + "_at_stwp");
      addToDict(code + gen + "_at_stwk");

      addToDict(code + gen + "_at_sylp");
      addToDict(code + gen + "_at_syrp");
      addToDict(code + gen + "_at_sylk");
      addToDict(code + gen + "_at_syrk");
      addToDict(code + gen + "_at_sywp");
      addToDict(code + gen + "_at_sywk");

      const inputs = ["lp", "rp", "lk", "rk", "wp", "wk"];
      const depth = 2;
      // Recursively generate all possible input combos of specified depth, using self, and store hashes.
      function generateAndStoreCombinations(prefix, combo = "", d = 0) {
        if (d === depth) {
          const animName = code + gen + "_at_" + combo;
          addToDict(animName);
          return;
        }
        for (const input of inputs) {
          generateAndStoreCombinations(prefix, combo + input, d + 1);
        }
      }

      generateAndStoreCombinations(code + gen + "_at_");
    }
  }

  fs.writeFileSync("./name_keys.json", JSON.stringify(nameKeys, null, 2));
})();
