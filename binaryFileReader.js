class BinaryFileReader {
  constructor(arrayBuffer) {
    this.buffer = arrayBuffer
    this.view = new DataView(arrayBuffer)
    this.pointer = 0 // Keeps track of the current byte position
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

  getRemainingBytes() {
    return this.buffer.byteLength - this.pointer
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
    const low = this.view.getUint32(position, littleEndian)
    const high = this.view.getUint32(position + 4, littleEndian)
    if (position === this.pointer) this.pointer += 8
    return high * 2 ** 32 + low
  }

  readUInt64(position = this.pointer, littleEndian = true) {
    const low = this.view.getUint32(position, littleEndian)
    const high = this.view.getUint32(position + 4, littleEndian)
    if (position === this.pointer) this.pointer += 8
    return (BigInt(high) << 32n) | BigInt(low)
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
}

module.exports = BinaryFileReader
