// 创建存储在单个文件上的会自动保存的数据对象
import { Stanz } from "/packages/libs/stanz/main.js";

const updateData = (originData, afterData) => {
  for (let [key, value] of Object.entries(afterData)) {
    if (originData[key] === undefined) {
      // 没有数据就直接塞进去
      originData[key] = value;
    } else {
      if (typeof originData[key] === "object" && typeof value === "object") {
        updateData(originData[key], value);
      } else if (originData[key] !== value) {
        originData[key] = value;
      }
    }
  }

  // 删除旧的数据
  for (let key of Object.keys(originData)) {
    if (afterData[key] === undefined) {
      delete originData[key];
    }
  }
};

// 更新数据
const refreshData = async (data, handle) => {
  if (saving[handle.path]) {
    await saving[handle.path];
  }

  // 先获取内容
  const content = await handle.text();

  if (!content) {
    return;
  }

  updateData(data, JSON.parse(content));
};

const saving = {};

// 保存数据到文件
const saveData = async (data, handle) => {
  if (saving[handle.path]) {
    await saving[handle.path];
  }

  const selfPms = (saving[handle.path] = (async () => {
    // 写入数据
    await handle.write(JSON.stringify(data));

    if (selfPms === saving[handle.path]) {
      saving[handle.path] = null;
    }
  })());
};

export const createSingleData = async ({ handle }) => {
  const data = new Stanz({});

  await refreshData(data, handle);

  // 监听数据变动
  const wid = data.watchTick((e) => {
    saveData(data, handle);
  });

  // 监听文件变动
  const handleRevoke = await handle.observe(async () => {
    await refreshData(data, handle);
  });

  Object.defineProperties(data, {
    disconnect: {
      value() {
        handleRevoke();
        data.unwatch(wid);
        data.revoke();
      },
    },
  });

  return data;
};
