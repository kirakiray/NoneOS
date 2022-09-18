import {
  writeFileDB,
  readFileDB,
  writeDirDB,
  readDirDB,
  initRoot,
} from "./base.mjs";

import { getName, createFid } from "./util.mjs";

export default async function mkdir(path) {
  const { dir, name } = getName(path);

  const targetData = await readDirDB(dir);

  const { content } = targetData;

  if (content[name]) {
    throw `${path} already exists`;
  }

  const dirData = {
    fid: createFid(),
    time: Date.now(),
  };

  content[name] = { ...dirData };

  const tasks = [
    {
      data: {
        path,
        ...dirData,
        content: {},
      },
    },
    {
      data: targetData,
    },
  ];

  await writeDirDB(tasks);

  console.log("dir  ==== ", targetData, name, dirData);
}
