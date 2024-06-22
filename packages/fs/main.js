import { getErr } from "./errors.js";
import { getData, setData, getRandomId } from "./db.js";
import { DirHandle } from "./handle/dir.js";
import { FileHandle } from "./handle/file.js";

/**
 * 获取传入字符串的handle对象
 * @param {String} path 文件或文件夹的路径
 * @returns {(DirHandle|FileHandle)}
 */
export const get = async (path) => {
  const paths = path.split("/");

  if (!paths.length) {
    throw getErr("pathEmpty");
  }

  // 获取根数据
  let rootData = await getData({
    index: "parent_and_name",
    key: ["root", "local"],
  });

  if (!rootData) {
    // 初始化Local目录
    await setData({
      datas: [
        {
          key: getRandomId(),
          parent: "root",
          name: "local",
        },
      ],
    });

    rootData = await getData({
      index: "parent_and_name",
      key: ["root", "local"],
    });
  }

  if (paths.length === 1) {
    return new DirHandle(rootData.key);
  }

  debugger;

  return new DirHandle(path);
};
