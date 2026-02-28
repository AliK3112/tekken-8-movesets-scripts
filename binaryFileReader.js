class BinaryFileReader {
  constructor(arrayBuffer) {
    this.buffer = arrayBuffer
    this.view = new DataView(arrayBuffer)
    this.pointer = 0 // Keeps track of the current byte position
  }

  /**
   * Opens a file from the given path and returns a BinaryFileReader instance.
   * @param {string} filePath - The path to the file.
   * @returns {BinaryFileReader}
   */
  static open(filePath) {
    const fs = require("fs")
    const buffer = fs.readFileSync(filePath)
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    )
    return new BinaryFileReader(arrayBuffer)
  }

  // Methods to adjust the seeker in the file
  seek(position) {
    if (position >= 0 && position < this.buffer.byteLength) {
      this.pointer = position
    } else {
      throw new Error("Position out of bounds")
    }
  }

  skip(offset) {
    this.seek(this.pointer + offset)
  }

  reset() {
    this.pointer = 0
  }

  getPosition() {
    return this.pointer
  }

  getSize() {
    return this.buffer.byteLength;
  }

  getRemainingBytes() {
    return this.buffer.byteLength - this.pointer
  }

  /**
   * Reads a custom structured value from the binary buffer using a user-defined reader function.
   *
   * This method provides a flexible way to parse complex data structures by delegating the reading logic
   * to a function `T`, which receives a context of basic read utilities and a starting position.
   *
   * @template T
   * @param {(context: {
  *   readUInt8: (pos: number) => number,
  *   readInt8: (pos: number) => number,
  *   readUInt16: (pos: number, le?: boolean) => number,
  *   readInt16: (pos: number, le?: boolean) => number,
  *   readUInt32: (pos: number, le?: boolean) => number,
  *   readInt32: (pos: number, le?: boolean) => number,
  *   readUInt64: (pos: number, le?: boolean) => bigint,
  *   readInt64: (pos: number, le?: boolean) => number,
  *   readFloat32: (pos: number, le?: boolean) => number,
  *   readFloat64: (pos: number, le?: boolean) => number,
  *   readString: (length: number, pos: number) => string,
  *   readNullTerminatedString: (pos: number) => string,
  *   readArrayOfBytes: (length: number, pos: number) => Uint8Array
  * }, position: number) => { value: T, size: number }} T - A function that parses a structure from binary data.
  *
  * @param {number} [position=this.pointer] - The byte offset at which to begin reading.
  *                                           If omitted, reading starts from the current pointer.
  *
  * @returns {T} The parsed value returned by the reader function.
  *
  * @throws {Error} If the reader function or parameters are invalid.
  *
  * @example
  * const reader = new BinaryFileReader(buffer);
  * const myStruct = reader.read((ctx, pos) => {
  *   const id = ctx.readUInt16(pos);
  *   const name = ctx.readNullTerminatedString(pos + 2);
  *   return { value: { id, name }, size: name.length + 3 };
  * });
  */
  read(T, position = this.pointer) {
    const initialPosition = position
    const context = {
      readUInt8: pos => this.readUInt8(pos),
      readInt8: pos => this.readInt8(pos),
      readUInt16: (pos, le = true) => this.readUInt16(pos, le),
      readInt16: (pos, le = true) => this.readInt16(pos, le),
      readUInt32: (pos, le = true) => this.readUInt32(pos, le),
      readInt32: (pos, le = true) => this.readInt32(pos, le),
      readUInt64: (pos, le = true) => this.readUInt64(pos, le),
      readInt64: (pos, le = true) => this.readInt64(pos, le),
      readFloat32: (pos, le = true) => this.readFloat32(pos, le),
      readFloat64: (pos, le = true) => this.readFloat64(pos, le),
      readString: (len, pos) => this.readString(len, pos),
      readNullTerminatedString: pos => this.readNullTerminatedString(pos),
      readArrayOfBytes: (len, pos) => this.readArrayOfBytes(len, pos),
    }

    const { value, size } = T(context, position)
    if (position === this.pointer) {
      this.pointer += size
    }

    return value
  }

  readInt(
    position = this.pointer,
    size = 4,
    unsigned = true,
    littleEndian = true
  ) {
    let value
    if (![1, 2, 4, 8].includes(size)) {
      throw new Error("Invalid size. Supported sizes are 1, 2, 4, or 8 bytes.")
    }

    switch (size) {
      case 1:
        value = unsigned ? this.readUInt8(position) : this.readInt8(position)
        break
      case 2:
        value = unsigned
          ? this.readUInt16(position, littleEndian)
          : this.readInt16(position, littleEndian)
        break
      case 4:
        value = unsigned
          ? this.readUInt32(position, littleEndian)
          : this.readInt32(position, littleEndian)
        break
      case 8:
        value = unsigned
          ? this.readUInt64(position, littleEndian)
          : this.readInt64(position, littleEndian)
        break
      default:
        throw new Error("Unsupported integer size.")
    }

    // Only move the pointer if reading from the current pointer position
    if (position === this.pointer) {
      this.pointer += size
    }

    return value
  }

  // Reading functions for different data types
  readInt8(position = this.pointer) {
    const value = this.view.getInt8(position)
    if (position === this.pointer) this.pointer += 1
    return value
  }

  readUInt8(position = this.pointer) {
    const value = this.view.getUint8(position)
    if (position === this.pointer) this.pointer += 1
    return value
  }

  readInt16(position = this.pointer, littleEndian = true) {
    const value = this.view.getInt16(position, littleEndian)
    if (position === this.pointer) this.pointer += 2
    return value
  }

  readUInt16(position = this.pointer, littleEndian = true) {
    const value = this.view.getUint16(position, littleEndian)
    if (position === this.pointer) this.pointer += 2
    return value
  }

  readInt32(position = this.pointer, littleEndian = true) {
    const value = this.view.getInt32(position, littleEndian)
    if (position === this.pointer) this.pointer += 4
    return value
  }

  readUInt32(position = this.pointer, littleEndian = true) {
    const value = this.view.getUint32(position, littleEndian)
    if (position === this.pointer) this.pointer += 4
    return value
  }

  readInt64(position = this.pointer, littleEndian = true) {
    if (position === this.pointer) this.pointer += 8
    return this.view.getBigInt64(position, littleEndian);
  }

  readUInt64(position = this.pointer, littleEndian = true) {
    if (position === this.pointer) this.pointer += 8
    return this.view.getBigUint64(position, littleEndian);
  }

  readFloat32(position = this.pointer, littleEndian = true) {
    const value = this.view.getFloat32(position, littleEndian)
    if (position === this.pointer) this.pointer += 4
    return value
  }

  readFloat64(position = this.pointer, littleEndian = true) {
    const value = this.view.getFloat64(position, littleEndian)
    if (position === this.pointer) this.pointer += 8
    return value
  }

  readString(length, position = this.pointer) {
    let result = ""
    for (let i = 0; i < length; i++) {
      result += String.fromCharCode(this.readUInt8(position + i))
    }
    if (position === this.pointer) this.pointer += length
    return result
  }

  readNullTerminatedString(position = this.pointer) {
    let result = ""
    let offset = 0
    while (true) {
      const char = this.readUInt8(position + offset)
      if (char === 0) break
      result += String.fromCharCode(char)
      offset++
    }
    if (position === this.pointer) this.pointer += offset + 1 // include the null byte
    return result
  }

  readArrayOfBytes(length, position = this.pointer) {
    const bytes = new Uint8Array(length)
    for (let i = 0; i < length; i++) {
      bytes[i] = this.readUInt8(position + i)
    }
    if (position === this.pointer) this.pointer += length
    return bytes
  }

  // Helper method to check if the end of the file/buffer has been reached
  isEOF() {
    return this.pointer >= this.buffer.byteLength
  }

  /**
   * Clears the file buffer to free up memory.
   * Note: The `open` method reads the entire file synchronously into memory, 
   * so no OS file descriptors are strictly kept open. This method is provided 
   * simply to aid garbage collection for large files.
   */
  close() {
    this.buffer = null
    this.view = null
    this.pointer = 0
  }
}

module.exports = BinaryFileReader
