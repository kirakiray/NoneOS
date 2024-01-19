import { fsId, badge, register } from "./base.js";
import { otherHandles } from "../main.js";

const getTarget = async (data) => {
  const { paths, fsName } = data;

  const root = otherHandles.find((e) => e.name === fsName);

  let targetFolder;
  if (!paths.length) {
    targetFolder = root.handle;
  } else {
    targetFolder = await root.handle.get(paths.join("/"));
  }

  return targetFolder;
};

register("dir-entries", async (data) => {
  if (data.fsId === fsId) {
    const targetFolder = await getTarget(data);

    const list = [];

    for await (let [name, handle] of targetFolder.entries()) {
      list.push({
        name,
        kind: handle.kind,
      });
    }

    return list;
  }
});

// register("remove-entry", async (data) => {
//   if (data.fsId === fsId) {
//     const target = await getTarget(data);

//     debugger;
//   }
// });

register("get-by-handle", async (data) => {
  if (data.fsId === fsId) {
    const target = await getTarget(data);
    let targetDir;
    if (data.dir) {
      try {
        targetDir = await target._handle.getDirectoryHandle(
          data.name,
          data.options || {}
        );
      } catch (err) {
        return {
          error: true,
          desc: err.toString(),
        };
      }

      return targetDir;
    } else {
      try {
        targetDir = await target._handle.getFileHandle(
          data.name,
          data.options || {}
        );
      } catch (err) {
        return {
          error: true,
          desc: err.toString(),
        };
      }

      return targetDir;
    }
  }
});

export class RemoteFileSystemDirectoryHandle {
  #fsId;
  #fsName;
  #paths = [];
  constructor(fsId, fsName, paths) {
    this.#fsId = fsId;
    this.#fsName = fsName;
    this.#paths = paths || [];
  }

  get name() {
    return this.#paths.slice(-1)[0];
  }

  get kind() {
    return "directory";
  }

  async getFileHandle(name, options) {
    const result = await badge("get-by-handle", {
      fsId: this.#fsId,
      fsName: this.#fsName,
      paths: this.#paths,
      name,
      options,
      dir: true,
    });

    if (result.error) {
      throw new Error(result.desc);
    }

    return new RemoteFileSystemFileHandle(this.#fsId, this.#fsName, [
      ...this.#paths,
      name,
    ]);
  }

  async getDirectoryHandle(name, options) {
    const result = await badge("get-by-handle", {
      fsId: this.#fsId,
      fsName: this.#fsName,
      paths: this.#paths,
      name,
      options,
      dir: true,
    });

    if (result.error) {
      throw new Error(result.desc);
    }

    const rootRemoteSystemHandle = new RemoteFileSystemDirectoryHandle(
      this.#fsId,
      this.#fsName,
      [...this.#paths, name]
    );

    return rootRemoteSystemHandle;
  }

  async removeEntry(name, options = {}) {
    throw getErr("removeEntry");

    // if (options.recursive) {
    //   debugger;
    // }

    // const result = await badge("remove-entry", {
    //   fsId: this.#fsId,
    //   fsName: this.#fsName,
    //   paths: this.#paths,
    //   options,
    // });
  }

  async *entries() {
    const list = await badge("dir-entries", {
      fsId: this.#fsId,
      fsName: this.#fsName,
      paths: this.#paths,
    });

    let len = list.length;
    for (let i = 0; i < len; i++) {
      const item = list[i];

      let result;

      const newPaths = [...this.#paths, item.name];

      if (item.kind === "directory") {
        result = new RemoteFileSystemDirectoryHandle(
          this.#fsId,
          this.#fsName,
          newPaths
        );
      } else {
        result = new RemoteFileSystemFileHandle(
          this.#fsId,
          this.#fsName,
          newPaths
        );
      }
      // result.name = item.name;
      yield [item.name, result];
    }
  }

  async *keys() {
    for await (let [name] of this.entries()) {
      yield name;
    }
  }
}

register("get-file", async (data) => {
  if (data.fsId === fsId) {
    const target = await getTarget(data);

    const file = await target.file();

    return { file };
  }
});

export class RemoteFileSystemFileHandle {
  #fsId;
  #fsName;
  #paths = [];
  constructor(fsId, fsName, paths) {
    this.#fsId = fsId;
    this.#fsName = fsName;
    this.#paths = paths;
  }

  get name() {
    return this.#paths.slice(-1)[0];
  }

  get kind() {
    return "file";
  }

  async createWritable() {
    throw getErr("createWritable");
  }

  async getFile() {
    const result = await badge("get-file", {
      fsId: this.#fsId,
      fsName: this.#fsName,
      paths: this.#paths,
    });

    return result.file;
  }

  async move() {
    throw getErr("move");
  }
}

const getErr = (name) => new Error(`can not use "${name}" in remote`);
