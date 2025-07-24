export const reservedKeys = ["dataStatus", "_dataId", "_spaceHandle"];

export const Identification = "__dataid__";

import { HybirdData } from "./hybird-data.js";

// 需要保存的对象
const needSaves = [];

let saving = false;
export const saveData = async (hydata) => {
  if (needSaves.includes(hydata)) {
    // 已经在保存队列中，不需要重复添加
    return;
  }

  needSaves.push(hydata);

  if (saving) {
    return;
  }

  saving = true;

  while (needSaves.length) {
    const data = needSaves.shift();
    await realSaveData(data);
  }

  saving = false;
};

// 保存数据
export const realSaveData = async (hydata) => {
  if (hydata.dataStatus !== "ok") {
    console.log("not saving: ", hydata.dataStatus);
    await hydata.ready();
  }

  hydata.dataStatus = "saving";

  const finnalData = {};

  await Promise.all(
    Object.entries(hydata).map(async ([key, value]) => {
      if (reservedKeys.includes(key)) {
        return;
      }

      // 如果是对象，递归处理
      if (value !== null && typeof value === "object") {
        // await saveData(value);
        // saveData(value);
        await realSaveData(value);
        finnalData[key] = `${Identification}${value._dataId}`;
        return;
      }

      finnalData[key] = value;
    })
  );

  let fileHandle;

  if (hydata.__newHy) {
    fileHandle = await hydata._spaceHandle.get(hydata._dataId, {
      create: "file",
    });
  } else {
    // 监听数据变化，实时写入到 handle 中
    fileHandle = await hydata._spaceHandle.get(hydata._dataId);
  }

  if (!fileHandle) {
    console.warn("fileHandle not found", hydata._dataId); // eslint-disable-line no-cons
    return;
  }

  const oldText = await fileHandle.text();
  const newText = JSON.stringify(finnalData);
  if (oldText === newText) {
    // 数据没有变化，不需要写入
    hydata.dataStatus = "ok"; // 数据没有变化，不需要写入，直接返回，不触发 dataStatus 的变化
    return;
  }

  // console.log("savedata", hydata); // eslint-disable-line no-cons

  try {
    // 数据变化，写入到 handle 中
    await fileHandle.write(newText, {
      remark: `writedby-${hydata._root.xid}`,
    });

    // console.log("savedata end", hydata); // eslint-disable-line no-cons
  } catch (err) {
    console.error(err);
  }

  if (oldText) {
    // 根据旧的数据，删除掉没有使用的对象文件
    const oldData = JSON.parse(oldText);
    const oldValues = Object.values(oldData);
    const newValues = Object.values(finnalData);
    const deleteValues = oldValues.filter((val) => !newValues.includes(val)); // 已被删除的value

    // console.log("deleteValues", deleteValues); // eslint-disable-line no-cons

    if (deleteValues.length) {
      await Promise.all(deleteValues.map((e) => removeData(e, hydata)));
    }
  }

  hydata.dataStatus = "ok";
};

const removeData = async (oldData, exitedData) => {
  if (typeof oldData !== "string" || !oldData.startsWith(Identification)) {
    return;
  }

  const dataId = oldData.replace(Identification, "");

  const rootMapper = exitedData._root._rootMapper; // 获取根对象的rootMapper

  // 从根上获取该对象
  const targetData = rootMapper.get(dataId);

  // 如果不存在 hybirddata owner，可以删除

  if (!targetData) {
    console.log("targetData not found", dataId); // eslint-disable-line no-cons
    return;
  }

  // 删除数据及其关联对象的具体实现
  const deleteDataAndRelated = async () => {
    targetData[NEEDREMOVEDATA] = true;

    // 删除子对象
    const childDeletions = Object.entries(targetData)
      .filter(([_, val]) => typeof val === "object")
      .map(([_, val]) => {
        if (val && val._dataId) {
          removeData(`${Identification}${val._dataId}`, exitedData);
        }
      });

    await Promise.all(childDeletions);

    // 清理数据
    rootMapper.delete(dataId);

    const fileHandle = await targetData._spaceHandle.get(dataId);
    if (fileHandle) {
      await fileHandle.remove();
    }
  };

  // 检查是否可以删除数据
  let canDelete = true;

  if (targetData.owner.size) {
    // 如果存在一个未被删除的owner，那么不能删除数据
    if (
      Array.from(targetData.owner).some((e) => {
        return e instanceof HybirdData && !e[NEEDREMOVEDATA];
      })
    ) {
      canDelete = false;
    }
  }

  if (canDelete) {
    await deleteDataAndRelated();
  }
};

const NEEDREMOVEDATA = Symbol("needRemoveData");

export const getRandomId = () => {
  try {
    if (crypto?.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (err) {}

  return Math.random().toString(36).slice(2);
};
