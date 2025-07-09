import { EverCache } from "/packages/libs/ever-cache.js";
const historyStorage = new EverCache("lumi-editor-history"); // 用于记录修改历史的空间

let saveHistoryDebounceTimer = null;

export const clearUndoHistory = () => {
  return historyStorage.clear();
};

// 保存编辑历史
export const saveHistory = (context) => {
  clearTimeout(saveHistoryDebounceTimer);
  saveHistoryDebounceTimer = setTimeout(async () => {
    if (context.itemData.content) {
      const contentData = context.itemData.content.map((item) =>
        extractContentItemData(item)
      );

      // 如果上一个 __undoContent，代表时从撤销过来的，看看数据是否对等，是的话不操作
      if (context.__undoContent) {
        if (compareContentData(contentData, context.__undoContent)) {
          // 如果当前的数据和后退档的历史数据一致，代表时通过撤销操作得到的数据FFhsdedachcotsad，iyhsilddohhhsdadur //
          console.log("撤销操作，不存档: ", context.__undoContent);
          return;
        }
      }

      const historyList = (await historyStorage.getItem("_history")) || [];

      // 将数据存档一份到历史
      const historyId = Date.now();
      await historyStorage.setItem(historyId, contentData);
      historyList.push(historyId);
      await historyStorage.setItem("_history", historyList);
    }
  }, 200);
};

export const handleUndo = async (context) => {
  // 获取历史数据
  const historyList = await historyStorage.getItem("_history");
  const previousHistoryList =
    (await historyStorage.getItem("_preHistory")) || [];

  if (!historyList || !historyList.length) {
    return;
  }

  // 清除
  const previousHistoryItem = historyList.pop();
  previousHistoryList.push(previousHistoryItem);
  await historyStorage.setItem("_preHistory", previousHistoryList);
  await historyStorage.setItem("_history", historyList);

  let previousContent = undefined;

  if (historyList.length) {
    const previousContentId = historyList.slice(-1)[0];
    previousContent = await historyStorage.getItem(previousContentId);
  }

  context.__undoContent = previousContent; // 记录当前是从撤回的操作

  if (!previousContent) {
    // 没有旧数据，撤销操作
    return;
  }

  // 根据旧的content，还原 itemData.content 的内容
  const restoredContent = [];
  const currentContent = context.itemData.content;

  previousContent.forEach((item) => {
    let existingItem = currentContent.find(
      (element) => element._dataId === item._dataId
    );

    if (!existingItem) {
      // 不存在则重新创建
      const newItem = {
        ...item,
      };
      delete newItem._dataId;

      restoredContent.push(newItem);
      return;
    }

    // 对已有的数据判断数据是否相等
    if (!compareItems(existingItem, item)) {
      // 不等则修正
      existingItem.type = item.type;
      existingItem.value = item.value;
      if (existingItem.attrs !== item.attrs) {
        Object.assign(existingItem.attrs, item.attrs);
      }
    }

    restoredContent.push(existingItem);
  });

  // 还原内容
  context.itemData.content = restoredContent;
};

// 获取 content 内单个item的纯净数据
const extractContentItemData = (item) => {
  const itemData = {
    type: item.type,
    value: item.value,
    _dataId: item._dataId,
  };

  if (item.attrs) {
    itemData.attrs = item.attrs;
  }

  return itemData;
};

const compareContentData = (contentA, contentB) => {
  const processedA = contentA.map(extractEssentialItemData);
  const processedB = contentB.map(extractEssentialItemData);

  return JSON.stringify(processedA) === JSON.stringify(processedB);
};

const extractEssentialItemData = (item) => {
  return {
    type: item.type,
    value: item.value,
    attrs: item.attrs,
  };
};

const compareItems = (itemA, itemB) => {
  const processedA = extractEssentialItemData(itemA);
  const processedB = extractEssentialItemData(itemB);

  return JSON.stringify(processedA) === JSON.stringify(processedB);
};
