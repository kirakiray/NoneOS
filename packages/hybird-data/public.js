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
    return;
  }

  // 数据变化，写入到 handle 中
  await fileHandle.write(newText, {
    remark: `writedby-${hydata._root.xid}`,
  });

  if (oldText) {
    // 根据旧的数据，删除掉没有使用的对象文件
    const oldData = JSON.parse(oldText);
    const oldKeys = Object.keys(oldData);
    const newKeys = Object.keys(finnalData);
    const deleteKeys = oldKeys.filter((key) => !newKeys.includes(key)); // 已被删除的key
    if (deleteKeys.length) {
      await Promise.all(
        deleteKeys.map(async (key) => {
          const val = oldData[key];

          // 删除掉没有使用的对象文件
          if (typeof val === "object" && val._dataId) {
            debugger;
            await removeData(val, hydata);
          }

          debugger;
        })
      );
      debugger;
    }
  }

  hydata.dataStatus = "ok";
};

const removeData = async (oldData, exitedData) => {
  debugger;
};

export const getRandomId = () => Math.random().toString(36).slice(2);
