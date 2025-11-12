const { readFileSync, writeFileSync, existsSync, mkdirSync } = require("fs");
const crypto = require("crypto");
const { decompress } = require("@mongodb-js/zstd");
const BinaryFileReader = require("./binaryFileReader");

const PATH = "/path/to/tkdata.bin";
const OUTPUT_DIR = "Binary";
const DECRYPTION_KEY = "u52&MRs=@Bz#HHUMoQ9WFm5TxKWdoHlD";
const KEYS_ARRAY = [
  0xadfb76c8, 0x7def1f1c, 0xa84b71e0, 0xd88448a2, 0x964f5b9e, 0x7ee2bc2c,
  0xa27d5221, 0xbb9fe67d, 0xad15269f, 0xec1a9785, 0x9bae2f45, 0xa4296896,
  0x275aa004, 0x37e22f31, 0x3803d4a7, 0x9b81329f,
];

function hex(number, length = 8) {
  let x = typeof number === "string" ? parseInt(number) : number;
  if (x < 0) {
    x = x >>> 0;
  }
  return "0x" + x.toString(16).padStart(length, "0");
}

/**
Binary\mothead\bin\*.motbin
Binary\mothead\movelist\*.mvl
Binary\avatar\*.ava
*/

// Folders inside tkdata.bin:
// mothead/bin
// mothead/movelist
// avatar
// fbsdata
// ghost
// list

const buildMotbin = (code) => `mothead\\bin\\${code}.motbin`;
const buildMvlbin = (code) => `mothead\\movelist\\${code}.mvl`;

// 13 is related to "drama"

// Mapping
const mapping = {
  0x10c4ef5f: "mothead\\bin\\ccn.motbin",
  0x12233177: "mothead\\bin\\cht.motbin",
  0x150ad517: "mothead\\bin\\ctr.motbin",
  0x15563876: "mothead\\movelist\\okm.mvl",
  0x16f1c1a4: "mothead\\bin\\pig.motbin",
  0x198ffb2f: "mothead\\bin\\crw.motbin",
  0x1c974551: "mothead\\bin\\okm.motbin",
  0x1fb7f371: "mothead\\bin\\mnt.motbin",
  0x20683930: "mothead\\movelist\\dog.mvl",
  0x20bb5017: "mothead\\movelist\\klw.mvl",
  0x26288457: "mothead\\movelist\\cat.mvl",
  0x2721cd9: "mothead\\bin\\cml.motbin",
  0x28089dd7: "mothead\\movelist\\hrs.mvl",
  0x298353b9: "mothead\\movelist\\cbr.mvl",
  0x2c7d4530: "mothead\\bin\\hrs.motbin",
  0x3229044: "mothead\\bin\\grf.motbin",
  0x337e022d: "mothead\\bin\\wlf.motbin",
  0x35b5bcfe: "mothead\\bin\\bee.motbin",
  0x38ea896b: "mothead\\bin\\dek.motbin",
  0x39279177: "mothead\\movelist\\ccn.mvl",
  0x39a58d5f: "mothead\\bin\\aml.motbin",
  0x3bef7afc: "mothead\\bin\\xxd.motbin",
  0x43043a1c: "mothead\\movelist\\bbn.mvl",
  0x4a541bb0: "mothead\\bin\\bsn.motbin",
  0x51f8adfd: "mothead\\movelist\\ghp.mvl",
  0x53883b88: "mothead\\bin\\bbn.motbin",
  0x5696ef41: "mothead\\bin\\xxe.motbin",
  0x59585ab0: "mothead\\bin\\kgr.motbin",
  0x5b3fd9fd: "mothead\\movelist\\cht.mvl",
  0x6002d193: "mothead\\bin\\pgn.motbin",
  0x651856c1: "mothead\\bin\\ghp.motbin",
  0x66e7e2ab: "mothead\\bin\\snk.motbin",
  0x6a1ea5bb: "mothead\\movelist\\ctr.mvl",
  0x6c4c25ba: "mothead\\bin\\rat.motbin",
  0x6eaec4b0: "mothead\\movelist\\lzd.mvl",
  0x72825f8b: "mothead\\movelist\\jly.mvl",
  0x73bea3c1: "mothead\\movelist\\rat.mvl",
  0x7da44738: "mothead\\movelist\\bee.mvl",
  0x80a27072: "mothead\\movelist\\snk.mvl",
  0x824a9b48: "mothead\\movelist\\crw.mvl",
  0x84611ce: "mothead\\bin\\rbt.motbin",
  0x8668c5a: "mothead\\movelist\\grl.mvl",
  0x86c78da1: "mothead\\bin\\ttr.motbin",
  0x87e1a47f: "mothead\\movelist\\lon.mvl",
  0x892cc71b: "mothead\\movelist\\wlf.mvl",
  0x8cb80b5c: "mothead\\movelist\\pgn.mvl",
  0x8fdfa780: "mothead\\movelist\\der.mvl",
  0x93139987: "mothead\\bin\\grl.motbin",
  0x938a55a: "mothead\\movelist\\knk.mvl",
  0x94a5679b: "mothead\\bin\\cat.motbin",
  0x95d4468e: "mothead\\bin\\xxf.motbin",
  0x95e8a763: "mothead\\movelist\\pig.mvl",
  0x995acc7f: "mothead\\bin\\klw.motbin",
  0x9bb0a44: "mothead\\bin\\tgr.motbin",
  0xa051b11a: "mothead\\bin\\zbr.motbin",
  0xa0768aa9: "mothead\\movelist\\bsn.mvl",
  0xa2589b3f: "mothead\\movelist\\cml.mvl",
  0xa2ebe46: "mothead\\movelist\\cmn.mvl",
  0xab6b9b20: "mothead\\bin\\got.motbin",
  0xad76b81f: "mothead\\bin\\der.motbin",
  0xad231cf3: "mothead\\movelist\\dek.mvl",
  0xb00353dc: "mothead\\bin\\xxc.motbin",
  0xb352fa92: "mothead\\bin\\kmd.motbin",
  0xb7d69f67: "mothead\\movelist\\ttr.mvl",
  0xbd5e0b00: "mothead\\movelist\\hms.mvl",
  0xc0fd1d4f: "mothead\\bin\\lzd.motbin",
  0xc1e5c2e: "mothead\\bin\\hms.motbin",
  0xc318c8eb: "mothead\\movelist\\rbt.mvl",
  0xc5276083: "mothead\\bin\\xxa.motbin",
  0xc6cf14ee: "mothead\\bin\\cbr.motbin",
  0xc6f7d2f8: "mothead\\movelist\\swl.mvl",
  0xcb1667b5: "mothead\\movelist\\mnt.mvl",
  0xd1ab3a37: "mothead\\movelist\\aml.mvl",
  0xd268df17: "mothead\\movelist\\kgr.mvl",
  0xd73dee27: "mothead\\bin\\xxg.motbin",
  0xd9ee9c6c: "mothead\\movelist\\zbr.mvl",
  0xdc299b55: "mothead\\bin\\dog.motbin",
  0xe19e8462: "mothead\\movelist\\ant.mvl",
  0xe3b6ee56: "mothead\\movelist\\tgr.mvl",
  0xe95a71a2: "mothead\\movelist\\kal.mvl",
  0xecb742fa: "mothead\\movelist\\swl.mvl",
  0xed17c2aa: "mothead\\bin\\swl.motbin",
  0xef9257e: "mothead\\bin\\ant.motbin",
  0xf6d9a89a: "mothead\\bin\\kal.motbin",
  0xf98b9c38: "mothead\\bin\\knk.motbin",
  0xfa8c9ae2: "mothead\\bin\\jly.motbin",
  0xfc909b36: "mothead\\movelist\\grf.mvl",
  0xfcad16ad: "mothead\\bin\\lon.motbin",
  0xfcc8348: "mothead\\bin\\xxb.motbin",
  0xfede5925: "mothead\\movelist\\kmd.mvl",
};

const print = console.log;

/**
 * @param {Uint8Array} bytes
 */
const toBytes = (bytes) =>
  Array.from(bytes, (b) => b & 0xff)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");

/**
 * @param {Uint8Array} uint8array
 */
function checksum8Additive(uint8array) {
  let sum = 0;
  for (let i = 0; i < uint8array.length; i++) {
    sum = (sum + uint8array[i]) & 0xff; // wrap at 8 bits
  }
  return sum;
}

/**
 * @param {Uint8Array} uint8array
 * @param {number} offset
 * @param {number} size
 */
function readInt(uint8array, offset, size = 4) {
  return Buffer.from(uint8array).readIntLE(offset, size);
}

/**
 * @param {Uint8Array} uint8array
 * @param {number} offset
 * @param {number} size
 */
function readUInt(uint8array, offset, size = 4) {
  return Buffer.from(uint8array).readIntLE(offset, size) >>> 0;
}

/**
 * @param {Uint8Array} uint8array
 * @param {number} offset
 * @param {number} size
 */
function readReverseSignature(uint8array, offset = 0, size = 8) {
  return Buffer.from(uint8array.subarray(offset, size).reverse()).toString(
    "ascii"
  );
}

const getByte = (value, byteNumber) => (value >>> (byteNumber * 8)) & 0xff;

function deriveKeyFromSeedIndex(seedIndex) {
  const buffer =
    "U%ZPP0S2y4WoIofdsjM@2a%LJr@#*Ir!u8?FTSD2T%YcYsYl3I0W8=tSiI9.EOTQJ4?09hmYC3L5FL0uzRHN2?JF9IX9WI7t?UAQ4FujsC3XH+RkqIGJ%k19$OJS&.AKh$@LFT1C83nXrjJ0MMcZVWF0Ln!SfhwzSKoWDjQj7c!PXVEYOKD@+BUZGhY5@#RgW+Gw0sKw63QBjAp$$QOEFB%$V5?jcS@Q+hfg!=DrtmmALG0G@UXXEaVr17bnLrDnovHG.%PfIyB!8W9n&#xAywcKo6te3DAYi$KSCCz8bXQiN331x77uw5IJVq.BUfckF4sEBp%XV+e6rFg*V.ZS40#supW8T3ZB4e892MpxUMPMxr8d4LCltyVlJHBWKjK2W4SlynsF1CK5CxAkwLd6?ta.W6cW4IrQ1f@x5tUvpfPxOOyao6kEjfaPKGsBYB=Y6qQwQW3l3oGtV5zEH=&EgBL8h7Zz5sm3L&HsrFLS8CKoh3lR.XBAWXnB%S*O5&q?H9zjOqqr#JqwX3TU%2hYHTJ&2dY*fWIrPdc!P$hPlzFZUQPkgy6+Pg5C8f#bYYXua9gDn484!XO=5BuHI2FX$RR8%&rX%c@6u8EFBYXLhi0BNW!w7d+Z=iOabHqZZXSQ6Db*sncGALQFLgm%lvHfKhMP5.78Gm0Dd?nFE9zsTBIF=f6VBtD=*1PWxmnthUSjGQ&tf@9l$CAJR87UM4I$2oa@8ncr48dDMyMuM7KZX4@B.Ny6dObQeSdJ2=8jkV61GvIBOHAbbUiWfDCu52&MRs=@Bz#HHUMoQ9WFm5TxKWdoHlDEOW$!4$z==VG9PkfxPIT4.y*737zPZ9V4?JG.rl7kHK$k44$hdf.L*QX.=wp&JbpULUm#GI2vJv*lPJ$2B7M9Gg.+.O6tgUZvU4HMV2&7gvcBHDA.FG9jzC@s5*6XW8mUHB6j$*tz$OVPYDjW@07apt&poihk.I69&*d%y=m%@XP1ERk+bTP0v5iHd?xQ9C%1O2t=Tj7.xpgABlCyee1i1hPVzegGXSQD1Fp1lQd*IxwpA%HtBmuG6c$#43S?HK*Q*!Tj0kAU&RTbDoRfW=!MwGiHM2KMMNNBK=31f#83gt%NXAzix3D!6EQ5O3NSZKvQYvSKuvUSu1gGAATF1MqWG7USVjG9NAjz1&?KW0dTMaCJfD!Luym?WWLN3nf9#UcDUvL02m7L2$zJA=dbNQ2N5kVybBg7JE3ByS3AaZO=u@ty2g*dPrYW7UN&pqA1g*rQ+7%PM3XTsLcH=B+BFRIDPTsLj!+=68T+%vIMaRzFoiC4rJA#uevTsalLrpO.WfY2SG%%qbKihqRXg2=IJwXKZ+xoYUydgLLh9eRt+Df0&5&C3T7i9sj.Z2TEUCxaNl2T8d@=Muw$S955+iHs=KCt?LZNFy*#%UU8gOHl*I9lQUXH4#cVYy9JY@gilIQ?v.TdkUBN9gHob*OVicLITzNqQpGL6wvupDkVqTlAORJTgL5RMKqQYpSD8LiYUp#aWKgFCBs1hCYTzFwa$*cllNQW.M2GSSI+x#qa#JcK7Cwh.v78hI1&T3c#DR&VDazL.XL2KGUSSBKmcc31R%JCa9736gp=QV5#I7%BGEdJkOs7QhKxt0n3sS4#sAl1BGNNXPx&9PoPx8.Gdv=eDotAfJmKuSUAirWB0XUe4FG9PYTgR??$t2IKh4+LjNCZ8TkXGqh=7rN4B86TZ3gjJ6QY#sT?FIc?Z*IstFG43YZqw%BwC&Ml2p7LB@JH!YW!zvNJYKjgaNm1!%sf$ZQbms4AkcOjs2Bh";

  const len = buffer.length;
  const offset = (44983 * seedIndex) % (len - 32);
  const key = buffer.slice(offset, offset + 32);
  print(`seedInex: ${seedIndex} - offset: ${offset} - key: ${key}`);

  return key;
}

function aes256EcbDecrypt(cipherBytesUint8, keyStr) {
  const key = Buffer.from(keyStr, "utf8"); // 32 bytes -> AES-256
  // createDecipheriv requires an IV param; AES-ECB doesn't use an IV so pass empty buffer
  const decipher = crypto.createDecipheriv("aes-256-ecb", key, Buffer.alloc(0));
  // keep default padding (PKCS#7). If your data is unpadded set to false and handle manually.
  // decipher.setAutoPadding(false);

  // input may be Uint8Array or ArrayBuffer
  const inputBuf = Buffer.from(cipherBytesUint8);
  const decrypted = Buffer.concat([
    decipher.update(inputBuf),
    decipher.final(),
  ]);
  return decrypted;
}

function looksLikeZstd(buf) {
  // ZSTD frame magic: 0x28 B5 2F FD (little-endian representation of 0xFD2FB528)
  if (!Buffer.isBuffer(buf) || buf.length < 4) return false;
  return (
    buf[0] === 0x28 && buf[1] === 0xb5 && buf[2] === 0x2f && buf[3] === 0xfd
  );
}

function verifyChecksum(buffer, targetChecksum) {
  const checksum = checksum8Additive(buffer);
  return +checksum === +targetChecksum;
}

async function main() {
  const stream = readFileSync(PATH);
  const reader = new BinaryFileReader(stream.buffer);

  // Verify
  if (reader.readString(16, 0) !== "__TEKKEN8FILES__") {
    print("Incorrect File!");
    return;
  }

  // Decrypt Footer
  const size = 128;
  const footerOffset = reader.getSize() - size;
  const footerBytes = reader.readArrayOfBytes(size, footerOffset); // Uint8Array

  let currentOffset = 1;
  for (let i = 0; i < KEYS_ARRAY.length; i++) {
    const key = KEYS_ARRAY[i];
    const keyBytes = [0, 1, 2, 3].map((i) => getByte(key, i));
    footerBytes[currentOffset - 1] ^= keyBytes[0];
    footerBytes[currentOffset] ^= keyBytes[1];
    footerBytes[currentOffset + 1] ^= keyBytes[2];
    footerBytes[currentOffset + 2] ^= keyBytes[3];
    currentOffset += 4;
  }

  // Verify Footer
  const magic = readReverseSignature(footerBytes);
  // 0x424e42696e50616b = 'kaPniBNB'
  if (magic !== "BNBinPak") {
    return print('Failed FOOTER signature. Expected "BNBinPak" in reverse');
  }

  // Read Stuff from Footer
  const decryptionFlag = Buffer.from(footerBytes.buffer).readUInt8(0x10);
  const aesKeyIndex = Buffer.from(footerBytes.buffer).readUInt8(0x11);
  const decryptionChecksum = Buffer.from(footerBytes.buffer).readUInt8(0x12);
  const decompressionChecksum = Buffer.from(footerBytes.buffer).readUInt8(0x13);
  const tocOffset = Buffer.from(footerBytes.buffer).readInt32LE(0x18);
  const compressedTocSize = Buffer.from(footerBytes.buffer).readInt32LE(0x20);
  const uncompressedTocSize = Buffer.from(footerBytes.buffer).readInt32LE(0x28);
  const someOtherOffset = Buffer.from(footerBytes.buffer).readInt32LE(0x38);

  print("FileSizeInBytes         ", hex(reader.getSize()));
  print("decryptionFlag:         ", hex(decryptionFlag, 2));
  print("aesKeyIndex:            ", hex(aesKeyIndex, 2));
  print("decryptionChecksum:     ", hex(decryptionChecksum, 2));
  print("decompressionChecksum:  ", hex(decompressionChecksum, 2));
  print("tocOffset:              ", hex(tocOffset, 8));
  print("compressedTocSize:      ", hex(compressedTocSize, 8));
  print("uncompressedTocSize:    ", hex(uncompressedTocSize, 8));
  print("someOtherOffset:        ", hex(someOtherOffset, 8));

  // Read TOC using Footer
  let tocContent = reader.readArrayOfBytes(compressedTocSize, tocOffset);
  if (tocContent.byteLength !== compressedTocSize) {
    return print("TOC Byte Length invalid");
  }

  if (decryptionFlag) {
    tocContent = aes256EcbDecrypt(tocContent, DECRYPTION_KEY);

    // print("checksum8Additive:", hex(checksum8Additive(tocContent), 2))
    // if (checksum8Additive(tocContent) !== decryptionChecksum) {
    //   return print("TOC Decryption Checksum Failed");
    // }
  }

  // Decompress Bytes
  if (looksLikeZstd(tocContent)) {
    print("Decrypted data begins with ZSTD frame magic (0x28 B5 2F FD).");
  } else {
    print(
      "No ZSTD header detected. first 16 bytes:",
      decrypted.slice(0, 16).toString("hex")
    );
    return;
  }
  tocContent = await decompress(Buffer.from(tocContent));

  if (tocContent.length !== uncompressedTocSize) {
    return print("Decompressed TOC size mismatched");
  }

  print("Decompressed length:", tocContent.length);

  // <80 05 db 24 49 00 9d ef fc 04 49 88 f6 ae bf 2e>
  // decrypted: <9d ca 07>
  // const other = reader.readArrayOfBytes(0x10, someOtherOffset);
  // print(toBytes(other))
  // print(hex(readInt(aes256EcbDecrypt(other, DECRYPTION_KEY), 3)))

  // Reading TOC
  const tocSig = readReverseSignature(tocContent);
  if (tocSig !== "BNBinLst") {
    return print('Invalid TOC signature. Expected "BNBinLst" in reverse');
  }

  const tocCount = readInt(tocContent, 0x8, 4);
  const tocStart = readInt(tocContent, 0x10, 4);
  print("tocCount", tocCount);
  print("tocStart", hex(tocStart));

  for (let i = 0; i < tocCount; i++) {
    const entryOffset = tocStart + i * 0x40; // Size of one entry is 64 bytes;
    const decryptFlag = readInt(tocContent, entryOffset + 0x8, 1);
    // const fileDcryptChksum = readUInt(tocContent, entryOffset + 0xA, 1);
    const fileDcryptChksum = Buffer.from(tocContent).readUInt8(
      entryOffset + 0xb
    );
    const fileDecompressChcksum = Buffer.from(tocContent).readUInt8(
      entryOffset + 0xa
    );
    const fileHash = readUInt(tocContent, entryOffset + 0x10);
    const fileOffset = readInt(tocContent, entryOffset + 0x18);
    const fileSize = readInt(tocContent, entryOffset + 0x20);
    const uncompressedFileSize = readInt(tocContent, entryOffset + 0x28);
    const globalOffset = 0x10 + fileOffset;
    const printValues = [
      `Entry: ${(i + 1).toString().padStart(3, " ")}:`,
      `Addr: ${hex(globalOffset)}.`,
      `Flags: ${toBytes(
        tocContent.subarray(entryOffset + 0x8, entryOffset + 0xc)
      )}.`,
      `Hash: ${hex(fileHash)}.`,
      `Offset: ${hex(fileOffset)}.`,
      `Size: ${hex(fileSize)}.`,
      `Name: ${mapping[fileHash] ?? "-"}`,
    ];

    // Let's try to read and decrypt this file
    let fileBuffer = reader.readArrayOfBytes(fileSize, globalOffset);

    const pn = (x) => hex(x, 2);

    // printValues.push(`RAW CHK: ${pn(checksum8Additive(fileBuffer))}`)

    // Decrypt file, no matter what
    fileBuffer = aes256EcbDecrypt(fileBuffer, DECRYPTION_KEY);

    // printValues.push(`CHK: ${pn(checksum8Additive(fileBuffer))}`)

    const chk1 = checksum8Additive(fileBuffer);
    if (!verifyChecksum(fileBuffer, fileDcryptChksum) && !decryptFlag) {
      printValues.push(
        `Extraction Failed: mismatched checksum. ${pn(
          fileDcryptChksum
        )} against ${pn(chk1)}`
      );
      print(printValues.join(" "));
      continue;
    }

    // Decompress if it looks like they can be decompressed
    if (looksLikeZstd(fileBuffer)) {
      fileBuffer = await decompress(Buffer.from(fileBuffer));

      if (fileBuffer.length !== uncompressedFileSize && decryptFlag) {
        // print(`Entry ${i + 1} uncompressed file size mismatch`);
        printValues.push(`Extraction Failed: uncompressed file size mismatch`);
        print(printValues.join(" "));
        continue;
      }
    }

    // Writing to file
    if (!existsSync(OUTPUT_DIR)) {
      mkdirSync(OUTPUT_DIR);
    }
    writeFileSync(
      `${OUTPUT_DIR}/${hex(fileHash, 1).toLowerCase()}`,
      fileBuffer
    );

    print(printValues.join(" "));

    // break; // temporary
    // if (i === 125) break; // temporary
  }

  print("Extracted all files from TkData.bin");
  return;
}

main();
