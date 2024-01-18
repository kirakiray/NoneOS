import { otherHandles } from "../main.js";
import { NDirHandle } from "../handle.js";
import { RemoteFileSystemDirectoryHandle } from "./fake-handle.js";
import { register, post, remotes, filerootChannel, fsId } from "./base.js";

export { remotes };

if (document.querySelector("[data-fsid]")) {
  document.querySelector("[data-fsid]").innerHTML = fsId;
}

const addRemotes = (data) => {
  const targetRemote = remotes.find((e) => e.fsId === data.fsId);

  if (!targetRemote) {
    let folders = [];
    if (data.others.length) {
      folders = data.others.map((fsName) => {
        const rootRemoteSystemHandle = new RemoteFileSystemDirectoryHandle(
          data.fsId,
          fsName
        );

        return {
          name: fsName,
          _handle: new NDirHandle(rootRemoteSystemHandle),
        };
      });
    }

    remotes.push({
      fsId: data.fsId,
      folders,
    });
  } else {
    if (data.others.length > targetRemote.folders.length) {
      data.others.forEach((fsName) => {
        // 添加不存在的节点
        if (!targetRemote.folders.some((e) => e.name === fsName)) {
          const rootRemoteSystemHandle = new RemoteFileSystemDirectoryHandle(
            data.fsId,
            fsName
          );

          targetRemote.folders.push({
            name: fsName,
            _handle: new NDirHandle(rootRemoteSystemHandle),
          });
        }
      });
    }
  }
};

// 基础远端数据广播
register("init", async (data) => {
  addRemotes(data);

  post({
    type: "re-init",
    fsId,
    others: otherHandles.map((e) => e.name),
  });
});

register("re-init", async (data) => {
  addRemotes(data);
});

register("close", async (data) => {
  const oldId = remotes.findIndex((e) => e.fsId === data.fsId);
  if (oldId > -1) {
    remotes.splice(oldId, 1);
  }
});

setTimeout(() => {
  post({
    type: "init",
    fsId,
    others: otherHandles.map((e) => e.name),
  });
});

export const cast = () => {
  post({
    type: "re-init",
    fsId,
    others: otherHandles.map((e) => e.name),
  });
};

globalThis.addEventListener("beforeunload", (event) => {
  post({
    type: "close",
    fsId,
  });
});

filerootChannel.addEventListener("message", (event) => {
  if (document.querySelector("[data-remotes]")) {
    document.querySelector("[data-remotes]").innerHTML = JSON.stringify(
      remotes.map((e) => e.fsId)
    );
  }
});

window.remotes = remotes;
