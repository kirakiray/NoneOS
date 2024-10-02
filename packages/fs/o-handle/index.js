import { OriginDirHandle } from "./dir.js";
import { OriginFileHandle } from "./file.js";
import { getErr } from "../errors.js";

const originInited = (async () => {
  const opfsRoot = await navigator.storage.getDirectory();

  await opfsRoot.getDirectoryHandle("local", {
    create: true,
  });
})();

/**
 * 获取传入字符串的handle对象
 * @param {string} path 需要打开的地址
 * @param {object} options 打开的选项
 * @returns {(OriginDirHandle|OriginFileHandle)}
 */
export const get = async (path, options) => {
  const originPath = path;

  if (/^\$origin/.test(path)) {
    const arr = path.split(":");
    path = arr[1];
  }

  const paths = path.split("/");

  if (!paths.length) {
    throw getErr("pathEmpty");
  }

  if (paths[0] === "") {
    throw getErr("rootEmpty");
  }

  await originInited;

  const opfsRoot = await navigator.storage.getDirectory();

  const localRoot = await opfsRoot.getDirectoryHandle(paths[0], {
    create: true,
  });

  const rootHandle = new OriginDirHandle(localRoot, originPath.split("/")[0]);

  if (paths.length === 1) {
    return rootHandle;
  }

  return rootHandle.get(paths.slice(1).join("/"), options);
};

/**
 * 通过 showDirectoryPicker 或 showOpenFilePicker 打开文件选择器
 * @param {string} type 选择器类型，默认为 dir
 * @param {object} options 选择器选项
 * @returns {(OriginDirHandle|OriginFileHandle)} 返回选择器的 handle
 */
export const showPicker = async (type = "dir", options) => {
  if (!window.showDirectoryPicker) {
    throw getErr("noPicker");
  }

  if (type === "dir") {
    return new OriginDirHandle(
      await window.showDirectoryPicker({
        mode: "readwrite",
        ...options,
      })
    );
  } else {
    return new OriginFileHandle(
      await window.showFilePicker({
        mode: "readwrite",
        options,
      })
    );
  }
};
