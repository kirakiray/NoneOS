import { getErr } from "./errors.js";
import { getData, setData, getRandomId } from "./db.js";
import { DirHandle } from "./handle/dir.js";
import { FileHandle } from "./handle/file.js";

// 初始化Local
const inited = (async () => {
  // 获取根数据
  const localData = await getData({
    index: "parent_and_name",
    key: ["root", "local"],
  });

  if (!localData) {
    // 初始化Local目录
    await setData({
      datas: [
        {
          key: getRandomId(),
          parent: "root",
          name: "local",
          createTime: Date.now(),
        },
      ],
    });
  }
})();

/**
 * 获取传入字符串的handle对象
 * @param {String} path 文件或文件夹的路径
 * @returns {(DirHandle|FileHandle)}
 */
export const get = async (path, options) => {
  const paths = path.split("/");

  if (!paths.length) {
    throw getErr("pathEmpty");
  }

  if (paths[0] === "") {
    throw getErr("rootEmpty");
  }

  await inited;

  const rootData = await getData({
    index: "parent_and_name",
    key: ["root", paths[0]],
  });

  if (!rootData) {
    throw getErr("rootNotExist", {
      rootname: paths[0],
    });
  }

  const rootHandle = new DirHandle(rootData.key);

  if (paths.length === 1) {
    await rootHandle.refresh();
    return rootHandle;
  }

  return rootHandle.get(paths.slice(1).join("/"), options);
};

import { OriginDirHandle } from "./op-handle/dir.js";

export const origin = {
  async get(path, options) {
    const paths = path.split("/");

    if (!paths.length) {
      throw getErr("pathEmpty");
    }

    if (paths[0] === "") {
      throw getErr("rootEmpty");
    }

    const opfsRoot = await navigator.storage.getDirectory();

    const localRoot = await opfsRoot.getDirectoryHandle(paths[0], {
      create: true,
    });

    const rootHandle = new OriginDirHandle(localRoot);

    if (paths.length === 1) {
      return rootHandle;
    }

    return rootHandle.get(paths.slice(1).join("/"), options);
  },
};
