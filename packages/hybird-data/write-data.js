export const SELFHANDLE = Symbol("self_handle"); // 临时存储监听的池子
export const reservedKeys = ["dataStatus", "_id"];
export const Identification = "__dataid__";
export const DATAID = Symbol("data_id");

const watcherPool = [];

// 重新保存数据
export const saveData = async (hydata) => {
  console.log("saveData: ", hydata);
  if (!watcherPool.includes(hydata)) {
    watcherPool.push(hydata);
  }

  if (!isRunning) {
    // 添加延迟减少重复写入的次数
    await new Promise((resolve) => setTimeout(resolve, 200));

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

  const finnalObj = {
    _id: nextHyData[DATAID],
  };

  for (let [key, value] of Object.entries(nextHyData)) {
    if (reservedKeys.includes(key) || /^\_/.test(key)) {
      continue;
    }

    // 如果是对象类型，写入到新的文件夹内
    if (value && typeof value === "object") {
      finnalObj[key] = `${Identification}${value._dataid}`;
      continue;
    }

    finnalObj[key] = value;
  }

  await dFile.write(JSON.stringify(finnalObj));

  await clearOldData(nextHyData, finnalObj);

  console.log("runWriteTask", nextHyData);

  runWriteTask(nextHyData);
};

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
