import { otherHandles } from "../main.js";
import { badge, post, register, fsId, remotes } from "./base.js";

const addRemotes = (data) => {
  const targetRemote = remotes.find((e) => e.fsId === data.fsId);

  if (!targetRemote) {
    remotes.push({
      fsId: data.fsId,
      others: data.others,
    });
  } else {
    targetRemote.others = data.others;
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