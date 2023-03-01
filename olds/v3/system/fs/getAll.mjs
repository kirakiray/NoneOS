import { readDB } from "./base.mjs";
import fs from "./fs.mjs";

// 获取制定mK
const getData = async (fid, path) => {
  const { content, type, time } = await readDB(fid);
  const childs = [];

  const redata = {
    path,
    type,
    time,
  };

  if (type === "folder") {
    await Promise.all(
      Object.entries(content).map(async ([name, ori]) => {
        let ndata = await getData(ori.fid, `${path}/${name}`);

        childs.push(ndata);
      })
    );

    redata.content = childs;
  } else {
    redata.content = content;
  }

  return redata;
};

// 一口气获取目录下所有数据
const getAll = async (path) => {
  const fd = await fs.read(path);
  const redata = await getData(fd.fid, path === "/" ? "" : path);

  if (!redata.path) {
    redata.path = "/";
  }

  return redata;
};

export default getAll;
