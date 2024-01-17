import { otherHandles } from "../main.js";
import { NDirHandle } from "../handle.js";
import { RemoteFileSystemDirectoryHandle } from "./handle.js";
import { filerootChannel, fsId } from "./base.js";
import { badge, register, post } from "./base.js";

export const remotes = [];

if (document.querySelector("[data-fsid]")) {
  document.querySelector("[data-fsid]").innerHTML = fsId;
}

console.log("fsId", fsId);

// 远程控制器
class RemoteControl {
  #id;
  constructor(id) {
    this.#id = id;
  }

  async getAll() {
    const result = await badge("get-all", {
      fsId: this.#id,
    });

    return result.handles.map((e) => {
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

register("get-all", async (data) => {
  if (data.fsId === fsId) {
    return {
      handles: otherHandles,
    };
  }
});

// 监听该频道并处理消息
filerootChannel.addEventListener("message", (event) => {
  const { data } = event;

  switch (data.type) {
    case "init":
      {
        const obj = new RemoteControl(data.fsId);
        remotes.push(obj);
        post({
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
  }

  if (document.querySelector("[data-remotes]")) {
    document.querySelector("[data-remotes]").innerHTML = JSON.stringify(
      remotes.map((e) => e.fsId)
    );
  }
});

window.remotes = remotes;

post({
  type: "init",
  fsId,
});

globalThis.addEventListener("beforeunload", (event) => {
  post({
    type: "close",
    fsId,
  });
});
