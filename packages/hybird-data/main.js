import { HybirdData } from "./hybird-data.js";
import { createSingleData } from "./single-data.js";

export const createData = async (handle, options) => {
  if (handle.kind === "file") {
    return createSingleData({ handle });
  }

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
  let finnalData = {};

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

  let isArray = true;
  let maxLength = 0;

  for (let [key, value] of Object.entries(data)) {
    if (/\D/.test(key)) {
      isArray = false;
    } else if (isArray && maxLength < parseInt(key)) {
      maxLength = parseInt(key);
    }

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

  if (isArray) {
    finnalData.length = maxLength + 1;
    finnalData = Array.from(finnalData);
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
