import { writeDB, readDB, initRoot } from "./base.mjs";
import { getName, createFid } from "./util.mjs";

// 获取相应的目录数据
const readFolder = async (dir) => {
  const dirArr = dir.split("/").filter((e) => !!e);

  let targetFolder = await readDB("/");

  let cata = "/";
  while (dirArr.length) {
    let nextDir = dirArr.shift();
    cata += nextDir;

    let nextData = targetFolder.content[nextDir];

    if (!nextData) {
      throw `${cata} does not exist`;
    }

    targetFolder = await readDB(nextData.fid);
  }

  if (!targetFolder) {
    throw `find out ${dir}`;
  }

  return targetFolder;
};

// 正在写入中的文件
const writingMap = new Map();
const writedMap = new Map();

const getResolver = async (dir) => {
  let pms, resolve;

  if (!writingMap.has(dir)) {
    pms = new Promise((res) => (resolve = res));
    writingMap.set(dir, pms);
    let finallyPmsResolve;
    const finallyPms = new Promise((res) => (finallyPmsResolve = res));
    finallyPms.res = finallyPmsResolve;
    writedMap.set(dir, finallyPms);
  } else {
    // 正在写入中的目录进行排队操作
    const oldPms = writingMap.get(dir);

    pms = oldPms.then(() => new Promise((res) => (resolve = res)));
    writingMap.set(dir, pms);

    await oldPms;
  }

  return {
    resolve: () => {
      dir;
      const inWritingPms = writingMap.get(dir);
      if (inWritingPms === pms) {
        writingMap.delete(dir);
      }

      resolve();

      if (inWritingPms === pms) {
        // 执行finally
        const finallyPms = writedMap.get(dir);
        finallyPms.res();
        writedMap.delete(dir);
      }
    },
  };
};

// 通用写入 data 方法
const writeData = async ({ dir, name, type, data }) => {
  const { resolve } = await getResolver(dir);
  const targetFolder = await readFolder(dir);

  const targetFolderContent = targetFolder.content;

  let oldFiles = [];

  const contentTarget = targetFolderContent[name];
  if (contentTarget) {
    if (contentTarget.type === "folder") {
      resolve();
      throw `'${name}' folder already exists`;
    } else {
      oldFiles = [
        {
          operation: "delete",
          data: contentTarget.fid,
        },
      ];
    }
  }

  const fid = createFid();

  const newData = {
    fid,
    type,
    content: data,
  };

  targetFolderContent[name] = {
    fid,
    type,
  };

  // 写入数据
  await writeDB([{ data: newData }, { data: targetFolder }, ...oldFiles]);

  resolve();
};

// 添加文件夹
export const mkdir = async (path) => {
  const { dir, name } = getName(path);

  return await writeData({
    dir,
    name,
    type: "folder",
    data: {},
  });
};

export const writeFile = async (path, data) => {
  const { dir, name } = getName(path);

  return await writeData({
    dir,
    name,
    type: "file",
    data,
  });
};

// 读取相应路径的文件
export const read = async (path) => {
  const { dir, name } = getName(path);

  const parentFolderData = await readFolder(dir);

  if (path === "/") {
    return parentFolderData;
  }

  const targetInfo = parentFolderData.content[name];

  if (!targetInfo) {
    throw `${path} file not found`;
  }

  if (!/\/$/.test(path)) {
    path += "/";
  }

  const fpms = writedMap.get(path);

  if (fpms) {
    await fpms;
  }

  const targetData = await readDB(targetInfo.fid);

  let reData = targetData;

  if (targetData.type === "folder") {
    reData = {
      ...targetData,
      content: Object.entries(targetData.content).map((e) => {
        return {
          name: e[0],
          ...e[1],
        };
      }),
    };
  }

  return reData;
};

// 删除
const removeByData = async (parentFolderData, name, parentDir) => {
  const targetInfo = parentFolderData.content[name];
  const { type } = targetInfo;

  const task = [
    {
      operation: "delete",
      data: targetInfo.fid,
    },
  ];

  if (type === "folder") {
    const folderData = await readDB(targetInfo.fid);
    const folderPath = `${parentDir}${name}/`;

    await Promise.all(
      Object.entries(folderData.content).map(async ([fileName, data]) => {
        await removeByData(folderData, fileName, folderPath);
      })
    );

    delete parentFolderData.content[name];

    task.push({
      data: parentFolderData,
    });
  }

  // 删除目录
  await writeDB(task);
};

// 删除文件或目录
export const remove = async (path) => {
  const { dir, name } = getName(path);

  const { resolve } = await getResolver(dir);

  try {
    const parentFolderData = await readFolder(dir);
    await removeByData(parentFolderData, name, dir);
    resolve();
  } catch (error) {
    resolve();
    throw error;
  }
};

export default {
  inited: initRoot(),
  mkdir,
  writeFile,
  read,
  remove,
};
