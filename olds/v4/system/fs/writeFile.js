import { writeFileDB, readFileDB, readDirDB, writeDirDB } from "./base.mjs";
import { getName, createFid } from "./util.mjs";

export default async function writeFile(path, data) {
  const { dir, name } = getName(path);

  const targetData = await readDirDB(dir);

  const { content } = targetData;

  if (content[name]) {
    // 替换旧文件
    debugger;
  } else {
    // 新写入文件
    const fileData = {
      fid: createFid(),
      time: Date.now(),
    };

    content[name] = { ...fileData };

    await Promise.all([
      writeFileDB([
        {
          data: {
            ...fileData,
            data,
          },
        },
      ]),
      writeDirDB([
        {
          data: targetData,
        },
      ]),
    ]);
  }
}
