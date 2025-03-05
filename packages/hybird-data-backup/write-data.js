export const SELFHANDLE = Symbol("self_handle"); // 临时存储监听的池子
export const reservedKeys = ["dataStatus", "_id"];
export const Identification = "__dataid__";
export const DATAID = Symbol("data_id");

import { HybirdData } from "./main.js";

const watcherPool = [];

// 重新保存数据
export const saveData = async (hydata) => {
  console.log("saveData: ", hydata);
  if (!watcherPool.includes(hydata)) {
    watcherPool.push(hydata);
  }

  if (!isRunning) {
    // 添加延迟减少重复写入的次数
    await new Promise((resolve) => setTimeout(resolve, 50));

    isRunning = true;

    runWriteTask();
  }
};

let isRunning = false;
const runWriteTask = async () => {
  const nextHyData = watcherPool.shift();

  if (!nextHyData) {
    isRunning = false;
    return;
  }

  if (
    !nextHyData.disconnect &&
    (!nextHyData._owner || !nextHyData._owner.length)
  ) {
    // TODO: 已经被清除的数据，不需要在保存
    debugger;
  }

  await nextHyData._handleReady();

  const dFile = await nextHyData[SELFHANDLE].get("_d", {
    create: "file",
  });

  const finnalObj = nextHyData.getMarkData();

  // 根节点数据的xid
  let rootXid = null;
  {
    let currentData = nextHyData;
    while (true) {
      if (!currentData.owner.size) {
        // 没有父节点，直接关闭
        break;
      }

      for (let item of Array.from(currentData.owner)) {
        if (item instanceof HybirdData) {
          currentData = item;
          break;
        }
      }

      if (currentData.disconnect) {
        rootXid = currentData.xid;
        break;
      }
    }
  }

  await dFile.write(JSON.stringify(finnalObj), null, {
    remark: {
      rootXid,
      dataXid: nextHyData.xid,
    },
  });

  await clearOldData(nextHyData, finnalObj);

  console.log("runWriteTask", nextHyData);

  runWriteTask(nextHyData);
};

// 清除旧数据
const clearOldData = async (hyData, finnalObj) => {
  const dirHandle = hyData[SELFHANDLE];
  const finnalValues = Object.values(finnalObj);

  if (!dirHandle) {
    throw new Error("dirHandle is not found");
  }

  for await (const [key, value] of dirHandle.entries()) {
    if (value.kind === "dir") {
      // 如果查找不到对应的value对象标识，则进行删除
      if (!finnalValues.includes(`${Identification}${key}`)) {
        await value.remove();
      }
    }
  }
};
