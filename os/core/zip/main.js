import { flatFiles } from "../fs/system/base.js";

let worker;
const workerPath = import.meta.resolve("./worker.js");

try {
  worker = new Worker(workerPath);
} catch (err) {
  const workerBlob = await fetch(workerPath).then((e) => e.blob());
  const workerUrl = URL.createObjectURL(workerBlob);
  worker = new Worker(workerUrl);
}

const getTaskId = () => Math.random().toString("16").slice(2);

const resolver = {};

worker.onmessage = (e) => {
  if (e.data.error) {
    resolver[e.data.id].reject(e.data.error);
  } else {
    resolver[e.data.id].resolve(e.data.content);
  }
  resolver[e.data.id] = null;
};

export async function unzip(file) {
  const taskID = getTaskId();

  worker.postMessage({
    taskType: "unzip",
    id: taskID,
    file,
  });

  const files = await new Promise((resolve, reject) => {
    resolver[taskID] = { resolve, reject };
  });

  return files;
}

export async function exploreFolder(handler, rootName) {
  const taskID = getTaskId();

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
      path: `${rootName}/${
        e.parNames.length ? e.parNames.join("/") + "/" : ""
      }${e.name}`,
      file,
      isEnd: !len,
    });
  }

  return reobj;
}
