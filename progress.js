const fs = require("fs");
const BinaryFileReader = require("./BinaryFileReader");
const { readMovesList } = require("./utils");

const PATH = "./Binary/mothead/bin";

function main() {
  const files = fs.readdirSync(PATH).filter((file) => file.endsWith(".motbin") && !file.includes("ja4"));

  // Track unique hash keys to avoid counting duplicate entries across or inside files
  const uniqueNames = new Set();
  const uniqueAnims = new Set();

  let totalMovesCount = 0;
  let restoredNamesCount = 0;
  let restoredAnimsCount = 0;

  for (const file of files) {
    const fd = BinaryFileReader.open(`${PATH}/${file}`);
    // console.log(`Processing: ${file.replace(".motbin", "")}`);

    const moves = readMovesList(fd);

    for (const move of moves) {
      totalMovesCount++;

      if (!uniqueNames.has(move.name_key)) {
        uniqueNames.add(move.name_key);

        if (move.name) {
          restoredNamesCount++;
        }
      }

      if (!uniqueAnims.has(move.anim_name_key)) {
        uniqueAnims.add(move.anim_name_key);

        if (move.anim_name) {
          restoredAnimsCount++;
        }
      }
    }
    fd.close();
  }

  // Calculate percentages based on unique tracked totals
  const totalUniqueNames = uniqueNames.size;
  const totalUniqueAnims = uniqueAnims.size;

  const namePercentage = totalUniqueNames > 0 ? ((restoredNamesCount / totalUniqueNames) * 100).toFixed(2) : 0;
  const animPercentage = totalUniqueAnims > 0 ? ((restoredAnimsCount / totalUniqueAnims) * 100).toFixed(2) : 0;

  console.log(`========================================`);
  console.log(`Execution Complete Across All Files`);
  console.log(`========================================`);
  console.log(`Total Move Entries Processed (Raw): ${totalMovesCount}`);
  console.log(`----------------------------------------`);
  console.log(`Unique Names: ${restoredNamesCount} / ${totalUniqueNames} restored (${namePercentage}%)`);
  console.log(`Unique Animations: ${restoredAnimsCount} / ${totalUniqueAnims} restored (${animPercentage}%)`);
  console.log(`========================================`);
}

main();