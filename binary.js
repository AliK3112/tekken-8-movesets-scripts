const fs = require("fs")
const { hex, printInOrder, printObject, CHARACTER_NAMES, getCharacterName, sortByGameId } = require("./utils")
const BinaryFileReader = require('./BinaryFileReader');
const parentPath = "extracted_chars_v1_09"

const dataToRead = [
  { key: 'hitbox1_startup', offset: 0x160 },
  { key: 'hitbox2_startup', offset: 0x190 },
  { key: 'val3', offset: 0x18 },
  { key: 'val4', offset: 0x1C },
  // { key: '', offset: 0x0 },
  // { key: '', offset: 0x0 },
  // { key: '', offset: 0x0 },
  // { key: '', offset: 0x0 },
]

const pad = x => x.toString().padStart(6, " ")

/**
 * 
 * @param {bigint} parentAddr 
 * @param {BinaryFileReader} fileReader 
 */
function processMoves(parentAddr, fileReader) {
  const movesAddr = fileReader.readUInt64(0x230)
  const movesCount = fileReader.readUInt64(0x238)
  // Paul: 1, 0, 0, 1
  // Law: 0, 1, -1, 1
  // Jin: -5, 5, -6, 6
  // Kazuya: -7, 7, -8, 8
  const charId1 = fileReader.readInt16(0x164)
  const charId2 = fileReader.readInt16(0x166)

  const charName = CHARACTER_NAMES[charId1 === 0 && charId2 === 1 ? 0 : charId2]
  // console.log(hex(parentAddr, 16), hex(movesAddr - parentAddr + 16n, 16), movesCount, charName)
  // return;
  console.log(`=== ${charName} ===`)
  let addr = Number(movesAddr - parentAddr)
  for (let i = 0; i < movesCount; i++) {
    let offset = 0x160;
    let offset2 = 0x2E4;
    let message = '';
    let movePrinted = false;
    for (let j = 0; j < 8; j++) {
      const start = fileReader.readInt32(addr + offset + 0);
      const end = fileReader.readInt32(addr + offset + 4);
      const location = fileReader.readInt32(addr + offset + 8);
      const floats = Array(9).fill(0).map((_, k) => {
        return fileReader.readFloat32(addr + offset + 12 + k * 4)
      })
      // 0x2E4
      const signed = Array(3).fill(0).map((_, k) => {
        return fileReader.readInt32(addr + offset2 + k * 4);
      });
      const floats2 = Array(3).fill(0).map((_, k) => {
        return fileReader.readFloat32(addr + offset2 + 12 + k * 4);
      });
      const unsigned = Array(1).fill(0).map((_, k) => {
        return fileReader.readUInt32(addr + offset2 + 24 + k * 4);
      });
      const floats3 = Array(4).fill(0).map((_, k) => {
        return fileReader.readFloat32(addr + offset2 + 28 + k * 4);
      });
      const part1Data = [start, end, location, ...floats];
      const part2Data = [...signed, ...floats2, ...unsigned, ...floats3];

      message = [
        ...part1Data.slice(0, 2).map(pad),
        ...part1Data.slice(2, 3).map(x => hex(x, 4)),
        ...part1Data.slice(3).map(pad),
      ].join(" ")

      message = [
        message,
        part2Data.map(pad).join(" "),
      ].join(" | ")

      const flag1 = !!part1Data.filter(Boolean).length;
      const flag2 = !!part2Data.filter((x, i) => x !== (i < 6 ? -1 : 0)).length
      // const flag2 = !!part2Data.slice(-5).filter(Boolean).length
      if (flag1 || flag2) {
        if (!movePrinted) {
          console.log(`--- Move ${i + 1} ---`)
          movePrinted = true;
        }
        console.log(`${charName.slice(1, -1).padEnd(20, ' ')} - Hitbox ${j + 1} - ${message}`)
      }
      // console.log(`Hitbox ${j + 1} - ${message}`)

      message = '';
      offset += 0x30;
      offset2 += 0x2C;
    }
    addr += 0x448
  }
}

function process(buffer) {
  const parentAddr = buffer.readBigUInt64LE(0); // First 8 bytes as BigUInt
  const size = buffer.readBigUInt64LE(8);
  const arrayBuffer = buffer.buffer.slice(16)
  const fileReader = new BinaryFileReader(arrayBuffer)
  processMoves(parentAddr, fileReader)
  // if (getCharacterName(fileReader) === "[JIN]") {
  //   processMoves(parentAddr, fileReader)
  // }
  // console.log(hex(parentAddr, 16), hex(fileReader.readUInt32(0)))
}

function main() {
  const files = fs.readdirSync("./" + parentPath);
  sortByGameId(files)
  files.forEach(file => {
    const buffer = fs.readFileSync(`./${parentPath}/${file}`)
    process(buffer)
  })
}

main()
