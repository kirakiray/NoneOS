import { getData, setData, find, getRandomId } from "./db.js";
import {
  DIR,
  writeContent,
  getContent,
  removeDir,
  removeFile,
} from "./file.js";

const makesureDBkey = (_this) => {
  if (!_this.dbkey) {
    throw new Error(`This ${_this.kind} has been deleted`);
  }
};

class BaseHandle {
  #kind = "";
  #relates = [];
  #root = null;
  #dbkey = null;
  constructor({ kind, paths, root, dbkey }) {
    this.#kind = kind;
    this.#relates = paths || [];
    this.#root = root || null;
    this.#dbkey = dbkey;
  }

  get kind() {
    return this.#kind;
  }

  get name() {
    return this.#relates.slice(-1)[0];
  }

  get root() {
    return this.#root || this;
  }

  get path() {
    return this.#relates.join("/");
  }

  get paths() {
    return this.#relates.slice();
  }

  get dbkey() {
    return this.#dbkey;
  }

  async parent() {
    if (this.dbkey === "root") {
      return null;
    }

    const parentData = await getData({
      key: this.dbkey,
    });

    const paths = this.paths.slice(0, -1);

    return new DirHandle({
      paths,
      root: paths.length === 1 ? null : this.root,
      dbkey: parentData.parent,
    });
  }

  async remove(options) {
    this.#dbkey = null;

    if (this.kind === DIR) {
      return removeDir({ handle: this, options });
    }

    return removeFile({ handle: this });
  }

  async move(...args) {
    if (args.length === 1) {
      // 重命名
      const newName = args[0];

      const data = await getData({
        key: this.dbkey,
      });

      // 确认没有重复
      const existed = await find(
        {
          keyName: "parent",
          key: "root",
        },
        (item) => item.name === newName
      );

      if (existed) {
        throw new Error(`'${newName}' already exists`);
      }

      data.name = newName;

      await setData({
        datas: [data],
      });

      return null;
    }
  }

  async stat() {
    const data = await getData({ key: this.dbkey });

    return [{}, "createTime", "type", "lastModified"].reduce((obj, name) => {
      data[name] && (obj[name] = data[name]);
      return obj;
    });
  }
}

const createHandle = (parentHandle, handleData) => {
  let TargetHandle;
  switch (handleData.type) {
    case DIR:
      TargetHandle = DirHandle;
      break;
    case "file":
      TargetHandle = FileHandle;
      break;
  }

  return new TargetHandle({
    paths: [...parentHandle.paths, handleData.name],
    root: parentHandle.root,
    dbkey: handleData.key,
  });
};

const writingDB = {};

export class DirHandle extends BaseHandle {
  constructor(options) {
    super({ ...options, kind: DIR });
  }

  async get(name, options) {
    makesureDBkey(this);

    const defaults = {
      create: null, // DIR or "file"
      ...options,
    };

    const names = name.split("/");
    const namesLen = names.length;

    if (namesLen === 1) {
      // 已存在就直接返回存在的
      let result = await find(
        {
          key: this.dbkey,
          keyName: "parent",
        },
        (item) => item.name === name
      );

      if (!result) {
        if (!defaults.create) {
          return null;
        }

        // When writing files to an uncreated folder at the same time, it will cause the same folder to be created repeatedly.
        // At this time, the folder is only created for the first time, and the subsequent wait is completed before writing the file.
        let _res;
        if (!writingDB[`${this.dbkey}-${name}`]) {
          writingDB[`${this.dbkey}-${name}`] = new Promise(
            (resolve) => (_res = resolve)
          );

          await setData({
            datas: [
              (result = {
                key: getRandomId(),
                parent: this.dbkey,
                name,
                type: defaults.create === DIR ? DIR : "file",
                createTime: Date.now(),
              }),
            ],
          });

          _res(result);

          delete writingDB[`${this.dbkey}-${name}`];
        } else {
          result = await writingDB[`${this.dbkey}-${name}`];
        }
      }

      return createHandle(this, result);
    }

    let target = this;
    for (let item, i = 0; i < namesLen - 1; i++) {
      item = names[i];
      target = await target.get(item, {
        create: defaults.create && DIR,
      });

      if (!target) {
        throw new Error(`"${names.slice(0, i + 1).join("/")}" does not exist`);
      }
    }

    return await target.get(names.slice(-1)[0], defaults);
  }

  async *entries() {
    makesureDBkey(this);

    const datas = await getData({
      key: this.dbkey,
      keyName: "parent",
      all: true,
    });

    for (let item of datas) {
      yield [item.name, createHandle(this, item)];
    }
  }

  async *keys() {
    for await (let [name] of this.entries()) {
      yield name;
    }
  }

  async *values() {
    for await (let [, handle] of this.entries()) {
      yield handle;
    }
  }

  async removeEntry(name, options) {
    makesureDBkey(this);

    const target = await this.get(name);

    if (target) {
      return target.remove(options);
    }
  }
}

export class FileHandle extends BaseHandle {
  constructor(options) {
    super({ ...options, kind: "file" });
  }

  async write(content, process) {
    makesureDBkey(this);

    await writeContent({
      content,
      process,
      handle: this,
    });

    const data = await getData({
      key: this.dbkey,
    });

    data.lastModified = content.lastModified || Date.now();
    if (content instanceof File) {
      data.fileType = content.type;
    }

    await setData({
      datas: [data],
    });

    return true;
  }

  async read(options) {
    makesureDBkey(this);

    const defaults = {
      type: "file",
      ...options,
    };

    return await getContent({
      ...defaults,
      handle: this,
    });
  }

  file() {
    return this.read({ type: "file" });
  }

  text() {
    return this.read({ type: "text" });
  }

  buffer() {
    return this.read({ type: "buffer" });
  }
}
