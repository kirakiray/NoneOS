import { otherHandles } from "../main.js";
import { badge, post, register, fsId, remotes } from "./data.js";
import { RemoteDirHandle } from "./handle.js";

const remoteBadge = async (options, itemFsId) => {
  const { func, name, paths, self, args } = options;
  const rootname = self.root.name;

  let targetRootHandle;

  remotes.some((e) => {
    return e.others.some((item) => {
      if (item.name === rootname) {
        targetRootHandle = item;
        return true;
      }
    });
  });

  return await badge(func, {
    paths,
    name,
    rootname: self.root.name,
    fsId: itemFsId,
    args,
  });
};

const getHandle = async (data) => {
  const targetRootHandle = otherHandles.find(
    (e) => e.name === data.rootname
  ).handle;

  return data.paths.length === 0
    ? targetRootHandle
    : await targetRootHandle.get(`${data.paths.join("/")}`);
};

register("handle-entries", async (data) => {
  if (data.fsId === fsId) {
    const handle = await getHandle(data);

    const ens = [];
    for await (let e of handle.values()) {
      ens.push({
        name: e.name,
        kind: e.kind,
      });
    }

    return ens;
  }
});

register("handle-get", async (data) => {
  if (data.fsId === fsId) {
    const handle = await getHandle(data);

    const result = await handle.get(...data.args);

    return {
      kind: result.kind,
    };
  }
});

register("handle-read", async (data) => {
  if (data.fsId === fsId) {
    const handle = await getHandle(data);

    return await handle.read(...data.args);
  }
});

register("handle-write", async (data) => {
  if (data.fsId === fsId) {
    const handle = await getHandle(data);

    return await handle.write(...data.args);
  }
});

register("handle-remove-entry", async (data) => {
  if (data.fsId === fsId) {
    const handle = await getHandle(data);

    return await handle.removeEntry(...data.args);
  }
});

const addRemotes = (data) => {
  const targetRemote = remotes.find((e) => e.fsId === data.fsId);

  if (!targetRemote) {
    remotes.push({
      fsId: data.fsId,
      others: data.others.map(
        (name) =>
          new RemoteDirHandle({
            paths: [],
            _name: name,
            badge: (options) => remoteBadge(options, data.fsId),
          })
      ),
    });
  } else {
    targetRemote.others = data.others.map(
      (name) =>
        new RemoteDirHandle({
          paths: [],
          _name: name,
          badge: (options) => remoteBadge(options, data.fsId),
        })
    );
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

export const cast = async () => {
  post({
    type: "re-init",
    fsId,
    others: otherHandles.map((e) => e.name),
  });
};

setTimeout(() => {
  post({
    type: "init",
    fsId,
    others: otherHandles.map((e) => e.name),
  });
});

globalThis.addEventListener("beforeunload", (event) => {
  post({
    type: "close",
    fsId,
  });
});
