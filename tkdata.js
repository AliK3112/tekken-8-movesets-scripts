const { readFileSync, writeFileSync } = require("fs");
const crypto = require("crypto");
const BinaryFileReader = require("./binaryFileReader");

// TODO: Implement complete decryptor

const PATH = "D:\\SteamLibrary\\steamapps\\common\\TEKKEN 8\\Polaris\\Content\\Binary\\pak\\tkdata.bin";
const DECRYPTION_KEY = "u52&MRs=@Bz#HHUMoQ9WFm5TxKWdoHlD";

function aes256EcbDecrypt(cipherBytesUint8, keyStr) {
  const key = Buffer.from(keyStr, "utf8"); // 32 bytes -> AES-256
  // createDecipheriv requires an IV param; AES-ECB doesn't use an IV so pass empty buffer
  const decipher = crypto.createDecipheriv("aes-256-ecb", key, Buffer.alloc(0));
  // keep default padding (PKCS#7). If your data is unpadded set to false and handle manually.
  // decipher.setAutoPadding(false);

  // input may be Uint8Array or ArrayBuffer
  const inputBuf = Buffer.from(cipherBytesUint8);
  const decrypted = Buffer.concat([decipher.update(inputBuf), decipher.final()]);
  return decrypted;
}

function looksLikeZstd(buf) {
  // ZSTD frame magic: 0x28 B5 2F FD (little-endian representation of 0xFD2FB528)
  if (!Buffer.isBuffer(buf) || buf.length < 4) return false;
  return buf[0] === 0x28 && buf[1] === 0xB5 && buf[2] === 0x2F && buf[3] === 0xFD;
}

function main() {
  const stream = readFileSync(PATH);
  const reader = new BinaryFileReader(stream.buffer);
  const size = 0x2110;
  const offset = 0x6a3af960;
  const bytes = reader.readArrayOfBytes(size, offset); // Uint8Array
  // TODO: Do AES256 decryption - This decryption doesn't use any IV. After decryption, check for ZSTD header
  const decrypted = aes256EcbDecrypt(bytes, DECRYPTION_KEY);

  // write decrypted output (optional)
  writeFileSync("decrypted.bin", decrypted);
  console.log(`Wrote decrypted.bin (${decrypted.length} bytes)`);

  // check for ZSTD header
  if (looksLikeZstd(decrypted)) {
    console.log("Decrypted data begins with ZSTD frame magic (0x28 B5 2F FD).");
    // console.log(decrypted.toString("utf8")); // print first 64 bytes as UTF-8 string
  } else {
    // show first 16 bytes in hex for inspection
    console.log("No ZSTD header detected. first 16 bytes:", decrypted.slice(0, 16).toString("hex"));
  }
}

main();