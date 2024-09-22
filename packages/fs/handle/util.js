import { getData, setData } from "./db.js";
import { getErr } from "../errors.js";

/**
 * 判断旧hash是否还被引用，清除不被引用的块
 * @param {array} oldHashs 旧的文件块数据
 */
export const clearHashs = async (oldHashs) => {
  // 查找并删除多余的块
  const needRemoves = [];
  await Promise.all(
    oldHashs.map(async (key) => {
      const exited = await getData({
        index: "hash",
        key,
      });

      !exited && needRemoves.push(key);
    })
  );

  if (needRemoves.length) {
    await setData({
      storename: "blocks",
      removes: needRemoves,
    });
  }
};

/**
 * 获取自身在db上的数据，带有判断自身是否被删除的逻辑
 * @param {(DirHandle|FileHandle)} handle
 * @param {string} errName 当判断到当前handle已经被删除，报错的时的name
 * @returns {Object}
 */
export const getSelfData = async (handle, errName) => {
  const data = await getData({ key: handle.id });

  if (!data) {
    throw getErr(
      "deleted",
      {
        name: errName,
        path: handle.path,
      },
      handle
    );
  }

  return data;
};

/**
 * 更新所有父层的修改时间
 * @param {string} id 目标handle的id
 */
export const updateParentsModified = async (id) => {
  const parents = [];
  const time = Date.now();

  let key = id;

  while (key) {
    const targeData = await getData({ key });
    if (!targeData) {
      break;
    }

    targeData.lastModified = time;
    parents.push(targeData);
    key = targeData.parent;
  }

  await setData({
    datas: parents,
  });
};
