import { BaseDBHandle } from "./base.js";
import { getData, setData, getRandomId } from "./db.js";

export const init = async (name) => {
  let rootData = await getData({
    indexName: "parentAndName",
    index: ["root", name],
  });

  if (!rootData) {
    rootData = {
      id: getRandomId(),
      parent: "root",
      name,
      type: "dir",
    };

    // 不存在该根目录，重新创建
    await setData({
      puts: [rootData],
    });
  }

  debugger;

  return new BaseDBHandle({
    name: rootData.name,
    dbId: rootData.id,
    //  root,
    // parent,
  });
};
