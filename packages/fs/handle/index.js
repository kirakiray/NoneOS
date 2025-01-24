import { getErr } from "../errors.js";
import { getData, setData, getRandomId } from "./db.js";
import { DirHandle } from "./dir.js";
import { FileHandle } from "./file.js";

// 创建root空间
export const createRoot = async (name) => {
  const targetRootData = await getData({
    index: "parent_and_name",
    key: ["root", name],
  });

  if (!targetRootData) {
    // 初始化Local目录
    await setData({
      datas: [
        {
          key: getRandomId(),
          parent: "root",
          name,
          createTime: Date.now(),
        },
      ],
    });
  }
};

// 初始化Local
const inited = (async () => {
  // 创建三个关键目录
  await createRoot("local");
  await createRoot("apps");
  await createRoot("packages");
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
