export const SELFHANDLE = Symbol("self_handle"); // 临时存储监听的池子
export const reservedKeys = ["dataStatus", "_id"];
export const Identification = "__dataid__";
export const DATAID = Symbol("data_id");

const watcherPool = [];

// 重新保存数据
export const writeDataByHandle = async (hydata) => {
  console.log("writeDataByHandle: ", hydata);
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

  await nextHyData._handleReady();

  let oldData;

  const dFile = await nextHyData[SELFHANDLE].get("_d", {
    create: "file",
  });

  try {
    oldData = await dFile.text();
    if (oldData) {
      oldData = JSON.parse(oldData);
    }
  } catch (err) {
    // TODO: 错误的旧文件读取操作
    debugger;
  }

  const finnalObj = {
    _id: nextHyData[DATAID],
  };

  for (let [key, value] of Object.entries(nextHyData)) {
    if (reservedKeys.includes(key) || /^\_/.test(key)) {
      continue;
    }

    // 如果是对象类型，写入到新的文件夹内
    if (typeof value === "object") {
      finnalObj[key] = `${Identification}${value._dataid}`;
      continue;
    }

    finnalObj[key] = value;
  }

  await dFile.write(JSON.stringify(finnalObj));

  // 新value值，用于确认旧对象是否被删除
  const newValues = Object.values(finnalObj);

  // 清除被删除的子对象
  await Promise.all(
    Object.entries(oldData).map(async ([key, value]) => {
      if (reservedKeys.includes(key) || /^\_/.test(key)) {
        return;
      }

      // 如果是对象标识，则判断是否已被删除
      if (
        value instanceof String &&
        value.startsWith(Identification) &&
        !newValues.includes(value)
      ) {
        // 旧对象已经被删除
        const targetId = value.slice(Identification.length);

        const targetSubDirHandle = await nextHyData[SELFHANDLE].get(targetId);

        if (!targetSubDirHandle) {
          console.log("子对象没找到: ", targetId);
          return;
        }

        await targetSubDirHandle.remove();
      }
    })
  );

  console.log("runWriteTask", nextHyData);

  runWriteTask();
};
