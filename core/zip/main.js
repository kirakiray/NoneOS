import { flatFiles } from "../fs/base.js";

const worker = new Worker(import.meta.resolve("./worker.js"));

const resolver = {};

worker.onmessage = (e) => {
  resolver[e.data.id](e.data.content);
};

export async function exploreFolder(handler) {
  const taskID = Math.random().toString("16").slice(2);

  const files = await flatFiles(handler);
  let len = files.length;

  const reobj = new Promise((resolve) => {
    resolver[taskID] = resolve;
  });

  for (let e of files) {
    const { handle } = e;
    len--;

    const file = await handle.file();

    worker.postMessage({
      id: taskID,
      path: `${e.parNames.length ? e.parNames.join("/") + "/" : ""}${e.name}`,
      file,
      isEnd: !len,
    });
  }

  return reobj;
}
