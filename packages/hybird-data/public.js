export const reservedKeys = ["dataStatus", "_dataId", "_spaceHandle"];

export const Identification = "__dataid__";

// 保存数据
export const saveData = async (hydata) => {
  hydata.dataStatus = "saving";

  const finnalData = {};

  await Promise.all(
    Object.entries(hydata).map(async ([key, value]) => {
      if (reservedKeys.includes(key)) {
        return;
      }

      // 如果是对象，递归处理
      if (typeof value === "object") {
        await saveData(value);
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

  const oldText = await fileHandle.text();
  const newText = JSON.stringify(finnalData);
  if (oldText === newText) {
    // 数据没有变化，不需要写入
    hydata.dataStatus = "ok"; // 数据没有变化，不需要写入，直接返回，不触发 dataStatus 的变化
    return;
  }

  console.log("savedata", hydata); // eslint-disable-line no-cons

  // 数据变化，写入到 handle 中
  await fileHandle.write(newText, {
    remark: `writedby-${hydata._root.xid}`,
  });

  if (oldText) {
    // 根据旧的数据，删除掉没有使用的对象文件
    const oldData = JSON.parse(oldText);
    const oldValues = Object.values(oldData);
    const newValues = Object.values(finnalData);
    const deleteValues = oldValues.filter((val) => !newValues.includes(val)); // 已被删除的value
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

  const finnalFunc = async () => {
    // 标记为需要删除
    targetData.__needRemove = true;

    // 删除子对象
    await Promise.all(
      Array.from(Object.entries(targetData)).map(async ([key, val]) => {
        if (typeof val === "object") {
          return removeData(`${Identification}${val._dataId}`, exitedData);
        }
      })
    );

    // 没有被使用，删除
    rootMapper.delete(dataId);

    const fileHandle = await targetData._spaceHandle.get(dataId);

    if (fileHandle) {
      await fileHandle.remove();
    }
  };

  if (!targetData.owner.size) {
    finnalFunc();
  } else {
    // TODO: 有被使用，确认一下是否在其他子对象上；如果不在，删除

    // 确认owner是否准备被删除
    const exitedArr = Array.from(targetData.owner).filter(
      (e) => !e.__needRemove
    );

    if (!exitedArr.length) {
      finnalFunc();
    }
  }
};

export const getRandomId = () => Math.random().toString(36).slice(2);
