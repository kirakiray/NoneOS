function objectToUint8Array(obj) {
  if (!objectToUint8Array.Writer) {
    const TYPE_NULL = 0;
    const TYPE_BOOLEAN = 1;
    const TYPE_NUMBER = 2;
    const TYPE_STRING = 3;
    const TYPE_OBJECT = 4;
    const TYPE_UINT8ARRAY = 5;
    const textEncoder = new TextEncoder();

    class Writer {
      constructor(initialSize = 4096) {
        this.buffer = new ArrayBuffer(initialSize);
        this.dataView = new DataView(this.buffer);
        this.offset = 0;
      }

      ensureSize(needed) {
        if (this.offset + needed <= this.buffer.byteLength) return;
        const newSize = Math.max(
          this.buffer.byteLength * 2,
          this.offset + needed
        );
        const newBuffer = new ArrayBuffer(newSize);
        new Uint8Array(newBuffer).set(new Uint8Array(this.buffer));
        this.buffer = newBuffer;
        this.dataView = new DataView(this.buffer);
      }

      writeUint8(value) {
        this.ensureSize(1);
        this.dataView.setUint8(this.offset, value);
        this.offset++;
      }

      writeUint32(value) {
        this.ensureSize(4);
        this.dataView.setUint32(this.offset, value, true);
        this.offset += 4;
      }

      writeFloat64(value) {
        this.ensureSize(8);
        this.dataView.setFloat64(this.offset, value, true);
        this.offset += 8;
      }

      writeBytes(bytes) {
        this.ensureSize(bytes.length);
        new Uint8Array(this.buffer, this.offset, bytes.length).set(bytes);
        this.offset += bytes.length;
      }

      writeValueStack(valueStack) {
        while (valueStack.length) {
          const item = valueStack.pop();
          if (item === null) {
            this.writeUint8(TYPE_NULL);
          } else if (typeof item === "boolean") {
            this.writeUint8(TYPE_BOOLEAN);
            this.writeUint8(item ? 1 : 0);
          } else if (typeof item === "number") {
            this.writeUint8(TYPE_NUMBER);
            this.writeFloat64(item);
          } else if (typeof item === "string") {
            this.writeUint8(TYPE_STRING);
            const bytes = textEncoder.encode(item);
            this.writeUint32(bytes.length);
            this.writeBytes(bytes);
          } else if (item instanceof Uint8Array) {
            this.writeUint8(TYPE_UINT8ARRAY);
            this.writeUint32(item.length);
            this.writeBytes(item);
          } else if (typeof item === "object") {
            if (Array.isArray(item))
              throw new Error("Arrays are not supported");
            this.writeUint8(TYPE_OBJECT);
            const keys = Object.keys(item);
            this.writeUint32(keys.length);
            for (let i = keys.length - 1; i >= 0; i--) {
              const key = keys[i];
              valueStack.push(item[key]);
              valueStack.push(key);
            }
          } else if (typeof item === "undefined") {
            this.writeUint8(TYPE_NULL);
          } else {
            throw new Error(`Unsupported type: ${typeof item}`);
          }
        }
      }
    }

    objectToUint8Array.Writer = Writer;
  }

  const writer = new objectToUint8Array.Writer();
  writer.writeValueStack([obj]);
  return new Uint8Array(writer.buffer, 0, writer.offset);
}

function uint8ArrayToObject(uint8Array) {
  if (!uint8ArrayToObject.Reader) {
    const TYPE_NULL = 0;
    const TYPE_BOOLEAN = 1;
    const TYPE_NUMBER = 2;
    const TYPE_STRING = 3;
    const TYPE_OBJECT = 4;
    const TYPE_UINT8ARRAY = 5;
    const textDecoder = new TextDecoder("utf-8");

    class Reader {
      constructor(uint8Array) {
        this.dataView = new DataView(
          uint8Array.buffer,
          uint8Array.byteOffset,
          uint8Array.byteLength
        );
        this.offset = 0;
      }

      readUint8() {
        return this.dataView.getUint8(this.offset++);
      }

      readUint32() {
        const value = this.dataView.getUint32(this.offset, true);
        this.offset += 4;
        return value;
      }

      readFloat64() {
        const value = this.dataView.getFloat64(this.offset, true);
        this.offset += 8;
        return value;
      }

      readBytes(length) {
        const start = this.dataView.byteOffset + this.offset;
        const bytes = new Uint8Array(this.dataView.buffer, start, length);
        this.offset += length;
        return bytes;
      }

      readValue() {
        const type = this.readUint8();
        switch (type) {
          case TYPE_NULL:
            return null;
          case TYPE_BOOLEAN:
            return this.readUint8() !== 0;
          case TYPE_NUMBER:
            return this.readFloat64();
          case TYPE_STRING: {
            const length = this.readUint32();
            const bytes = this.readBytes(length);
            return textDecoder.decode(bytes);
          }
          case TYPE_OBJECT: {
            const count = this.readUint32();
            const obj = {};
            for (let i = 0; i < count; i++) {
              const key = this.readValue();
              obj[key] = this.readValue();
            }
            return obj;
          }
          case TYPE_UINT8ARRAY: {
            const length = this.readUint32();
            return this.readBytes(length);
          }
          default:
            throw new Error(`Unknown type: ${type}`);
        }
      }
    }

    uint8ArrayToObject.Reader = Reader;
  }

  const reader = new uint8ArrayToObject.Reader(uint8Array);
  return reader.readValue();
}

export { objectToUint8Array, uint8ArrayToObject };
