// 编辑器的撤销和重做功
// 初始化重做功能
export const initUndoRedo = (lumipage) => {
  document.addEventListener(
    "keydown",
    (lumipage._keydownFunc = (e) => {
      if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
        // 属于编辑器或body的操作
        if (
          e.composedPath().filter((e) => e.matches && e.matches("lumi-block"))
            .length ||
          e.target === document.body
        ) {
          const [app] = lumipage.parents.filter((e) => e.tag === "o-app");
          e.preventDefault();

          // 属于自身聚焦的状态，才允许撤销
          if (app.focused()) {
            if (e.shiftKey) {
              handleRedo(lumipage);
            } else {
              handleUndo(lumipage);
            }
          }
        }
      } else if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
        if (
          e.composedPath().filter((e) => e.matches && e.matches("lumi-page"))
            .length
        ) {
          e.preventDefault();

          // 提示上层保存
          lumipage.emit("lumi-page-save");
        }
      }
    })
  );
};

// 注销撤销重做功能
export const revokeUndoRedo = (lumipage) => {
  document.removeEventListener("keydown", lumipage._keydownFunc);
};

import { EverCache } from "/packages/libs/ever-cache.js";
const historyStorage = new EverCache("lumi-editor-history"); // 用于记录修改历史的空间

let saveHistoryDebounceTimer = null;

export const clearUndoHistory = () => {
  return historyStorage.clear();
};

// 保存编辑历史
export const saveHistory = (lumipage, watchs) => {
  clearTimeout(saveHistoryDebounceTimer);
  saveHistoryDebounceTimer = setTimeout(async () => {
    watchs;
    if (lumipage.itemData.content) {
      const contentData = lumipage.itemData.content.map((item) =>
        extractContentItemData(item)
      );

      // 如果上一个 __undoContent，代表时从撤销过来的，看看数据是否对等，是的话不操作
      if (lumipage.__undoContent) {
        // console.log("撤销操作，不存档: ", lumipage.__undoContent);
        lumipage.__undoContent = null;
        return;
        // if (compareContentData(contentData, lumipage.__undoContent)) {
        //   //   // 如果当前的数据和后退档的历史数据一致，代表时通过撤销操作得到的数据FFhsdedachcotsad，iyhsilddohhhsdadur //
        //   // console.log("撤销操作，不存档: ", lumipage.__undoContent);
        //   return;
        // }
      } else if (lumipage.__redoContent) {
        lumipage.__redoContent = null;
      } else {
        // 从普通状态过来的话，需要清除 redo 数据
        // console.log("清除 redo");
        historyStorage.setItem("_preHistory", []);
      }

      const historyList = (await historyStorage.getItem("_history")) || [];

      // 将数据存档一份到历史
      const historyId = Date.now();
      await historyStorage.setItem(historyId, contentData);
      historyList.push(historyId);
      await historyStorage.setItem("_history", historyList);
    }
  }, 300);
};

let doing = true;

export const handleRedo = async (lumipage) => {
  if (!doing) {
    return;
  }

  doing = false;

  // 获取历史数据
  const historyList = await historyStorage.getItem("_history");
  const previousHistoryList =
    (await historyStorage.getItem("_preHistory")) || [];

  if (previousHistoryList.length) {
    const previousContentId = previousHistoryList.pop();
    const previousContent = await historyStorage.getItem(previousContentId);
    await historyStorage.setItem("_preHistory", previousHistoryList);

    if (previousContent) {
      // 重新修正内容
      updatePageContent(lumipage, previousContent);

      lumipage.__redoContent = previousContent; // 记录当前是从撤回的操作
      lumipage.__undoContent = null;
    }
  }

  doing = true;
};

export const handleUndo = async (lumipage) => {
  if (!doing) {
    return;
  }

  doing = false;

  // 获取历史数据
  const historyList = await historyStorage.getItem("_history");
  const previousHistoryList =
    (await historyStorage.getItem("_preHistory")) || [];

  if (!historyList || !historyList.length || historyList.length === 1) {
    doing = true;
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

  console.log("save his ", previousContent);

  lumipage.__undoContent = previousContent; // 记录当前是从撤回的操作
  lumipage.__redoContent = null;

  if (!previousContent) {
    // 没有旧数据，撤销操作
    doing = true;
    return;
  }

  updatePageContent(lumipage, previousContent);

  doing = true;
};

const updatePageContent = (lumipage, previousContent) => {
  // 根据旧的content，还原 itemData.content 的内容
  const restoredContent = [];
  const currentContent = lumipage.itemData.content;

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
  lumipage.itemData.content = restoredContent;
};

// 获取 content 内单个item的纯净数据
const extractContentItemData = (item) => {
  const itemData = {
    type: item.type,
    value: item.value,
    _dataId: item._dataId,
  };

  if (item.attrs) {
    const attrs = { ...item.attrs };
    delete attrs.dataStatus;
    itemData.attrs = attrs;
  }

  return itemData;
};

// const compareContentData = (contentA, contentB) => {
//   const processedA = contentA.map(extractEssentialItemData);
//   const processedB = contentB.map(extractEssentialItemData);

//   return JSON.stringify(processedA) === JSON.stringify(processedB);
// };

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
