import { getErr } from "./errors.js";
import { getData } from "./db.js";
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
  // 获取根 handle
  const rootData = await getData({ key: paths[0] });

  if (paths.length === 1) {
    debugger;
    return new DirHandle();
  }

  return new DirHandle(path);
};
