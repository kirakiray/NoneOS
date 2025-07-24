import { HybirdData } from "./hybird-data.js";

export const createData = async (handle, options) => {
  const data = new HybirdData(
    {},
    {
      ...options,
      handle,
    }
  );

  await data.ready();

  return data;
};

// 直接加载对象数据
// handle 目标目录handle
// level 加载几层的数据
// dataId 目标数据id
export const loadData = async ({ handle, level = 2, dataId }) => {
  const finnalData = {};

  if (level <= 0) {
    Object.defineProperties(finnalData, {
      _dataId: {
        value: dataId,
      },
      dataStatus: {
        value: "unload",
      },
    });

    return finnalData;
  }

  // 先加载根数据
  const dataFileHandle = await handle.get(dataId || "_root");

  const content = await dataFileHandle.text();
  const data = JSON.parse(content);

  for (let [key, value] of Object.entries(data)) {
    if (/^__dataid__/.test(value)) {
      const subDataId = value.replace(/^__dataid__/, "");

      // 加载数据
      const realData = await loadData({
        handle,
        level: level - 1,
        dataId: subDataId,
      });

      finnalData[key] = realData;
    } else {
      finnalData[key] = value;
    }
  }

  Object.defineProperties(finnalData, {
    _dataId: {
      value: dataId,
    },
    dataStatus: {
      value: "ok",
    },
  });

  return finnalData;
};
