import { getData, setData } from "../db.js";
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
      },
      handle
    );
  }

  return data;
};
