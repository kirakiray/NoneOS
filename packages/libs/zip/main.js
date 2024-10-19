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

  const files = new Promise((resolve, reject) => {
    resolver[taskID] = { resolve, reject };
  });

  worker.postMessage({
    taskType: "unzip",
    id: taskID,
    file,
  });

  return files;
}

export function zips(files) {
  const taskID = getTaskId();

  const reobj = new Promise((resolve, reject) => {
    resolver[taskID] = { resolve, reject };
  });

  let len = files.length;

  for (let e of files) {
    const { file, path } = e;
    len--;

    worker.postMessage({
      id: taskID,
      path,
      file,
      isEnd: !len,
    });
  }

  return reobj;
}
