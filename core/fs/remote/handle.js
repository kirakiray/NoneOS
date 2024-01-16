import { fsId, badge, register } from "./base.js";
import { otherHandles } from "../main.js";

register("get-dir", async (data) => {
  debugger;
  return "hha";
});

register("dir-entries", async (data) => {
  if (data.fsId === fsId) {
    const { paths, fsName } = data;

    const root = otherHandles.find((e) => e.name === fsName);

    let targetFolder;
    if (!paths.length) {
      targetFolder = root.handle;
    } else {
      targetFolder = await root.handle.get(paths.join("/"));
    }

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

export class RemoteFileSystemDirectoryHandle {
  #fsId;
  #fsName;
  #paths = [];
  constructor(fsId, fsName, paths) {
    this.#fsId = fsId;
    this.#fsName = fsName;
    this.name = "";
    this.#paths = paths || [];
  }

  get kind() {
    return "directory";
  }

  async getFileHandle() {
    debugger;
  }

  async getDirectoryHandle(name, options) {
    const data = await badge("get-dir", {
      name,
      options,
    });

    debugger;
    return;
  }

  async remove() {
    debugger;
  }

  async removeEntry() {
    debugger;
  }

  async move() {
    debugger;
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

      const newPaths = [...this.#paths];
      if (this.name) {
        newPaths.push(this.name);
      }

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
      result.name = item.name;
      yield [item.name, result];
    }
  }

  async *keys() {
    for await (let [name] of this.entries()) {
      yield name;
    }
  }
}

export class RemoteFileSystemFileHandle {
  #fsId;
  #fsName;
  #paths = [];
  constructor(fsId, fsName, paths) {
    this.#fsId = fsId;
    this.#fsName = fsName;
    this.name = "";
    this.#paths = paths;
  }

  get kind() {
    return "file";
  }

  async createWritable() {
    debugger;
  }

  async getFile() {
    debugger;
  }
}
