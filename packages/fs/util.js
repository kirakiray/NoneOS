import { getData, setData } from "./db.js";

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
