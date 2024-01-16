import { otherHandles } from "../main.js";
import { NDirHandle } from "../handle.js";
import { RemoteFileSystemDirectoryHandle } from "./handle.js";
import { filerootChannel, fsId } from "./base.js";

export const remotes = [];

if (document.querySelector("[data-fsid]")) {
  document.querySelector("[data-fsid]").innerHTML = fsId;
}

console.log("fsId", fsId);

const resolver = {};

// 远程控制器
class RemoteControl {
  #id;
  constructor(id) {
    this.#id = id;
  }

  async getAll() {
    const results = await new Promise((resolve, reject) => {
      filerootChannel.postMessage({
        type: "getall",
        id: this.#id,
      });

      const timer = setTimeout(() => {
        resolver[this.#id] = null;
        reject(`Request timeout: ${fsId}`);
      }, 10000);

      resolver[this.#id] = { resolve, reject, timer };
    });

    return results.map((e) => {
      const rootRemoteSystemHandle = new RemoteFileSystemDirectoryHandle(
        this.#id,
        e.name
      );

      return {
        name: e.name,
        handle: new NDirHandle(rootRemoteSystemHandle),
      };
    });
  }

  get fsId() {
    return this.#id;
  }
}

// 监听该频道并处理消息
filerootChannel.addEventListener("message", (event) => {
  const { data } = event;

  switch (data.type) {
    case "init":
      {
        const obj = new RemoteControl(data.fsId);
        remotes.push(obj);
        filerootChannel.postMessage({
          type: "result-init",
          fsId,
        });
      }
      break;
    case "result-init":
      if (!remotes.some((e) => e.fsId === data.fsId)) {
        const obj = new RemoteControl(data.fsId);
        remotes.push(obj);
      }
      break;
    case "close":
      const oldId = remotes.findIndex((e) => e.fsId === data.fsId);
      if (oldId > -1) {
        remotes.splice(oldId, 1);
      }
      break;
    case "getall":
      // 获取所有其他
      if (data.id === fsId) {
        filerootChannel.postMessage({
          type: "result-getall",
          handles: otherHandles,
          fsId,
        });
      }
      break;
    case "result-getall":
      if (resolver[data.fsId]) {
        resolver[data.fsId].resolve(data.handles);
        resolver[data.fsId] = null;
        clearTimeout(data.timer);
      }
      break;
    case "getfile":
      break;
  }

  if (document.querySelector("[data-remotes]")) {
    document.querySelector("[data-remotes]").innerHTML = JSON.stringify(
      remotes.map((e) => e.fsId)
    );
  }
});

window.remotes = remotes;

filerootChannel.postMessage({
  type: "init",
  fsId,
});

globalThis.addEventListener("beforeunload", (event) => {
  filerootChannel.postMessage({
    type: "close",
    fsId,
  });
});
