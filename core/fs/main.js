import { NDirHandle } from "./handle.js";
import { remotes } from "./remote/remote.js";

const rootHandlePms = navigator.storage.getDirectory();

export const getLocal = async () => {
  return new NDirHandle(await rootHandlePms);
};

// 获取本地的 file system 数据
export const get = async (path = "", { handle, create, type } = {}) => {
  const root = new NDirHandle(handle || (await rootHandlePms));
  if (!path) {
    return root;
  }

  return await root.get(path, {
    create,
    type,
  });
};

export const otherHandles = [];

// 通过打开浏览器选择目录
export const open = async () => {
  if (window.showDirectoryPicker) {
    const oriHandle = await window.showDirectoryPicker({});

    const handle = new NDirHandle(oriHandle, []);

    otherHandles.push({
      name: handle.name,
      handle,
    });

    return handle;
  }

  throw "showDirectoryPicker does not exist";
};

// 获取所有已经挂载的目录
export const getAll = async () => {
  const root = await getLocal();

  return [
    {
      name: "Local",
      handle: root,
    },
    ...otherHandles,
  ];
};

export const getRemotes = async () => {
  // 获取远端的数据
  const remotesDir = [];

  await Promise.all(
    remotes.map(async (e) => {
      const all = await e.getAll();

      all.forEach((item) => {
        remotesDir.push({
          ...item,
          remote: true,
        });
      });
    })
  );

  return remotesDir;
};
