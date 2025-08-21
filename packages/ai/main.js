export { ask } from "./ask.js";
export { solicit } from "./solicit.js";

import { getAISetting } from "./custom-data.js";
import { getModels } from "./lmstudio.js";

let availablePms = null;

export const isAIAvailable = async () => {
  if (availablePms) {
    return availablePms;
  }

  return (availablePms = new Promise(async (resolve, reject) => {
    try {
      const setting = await getAISetting();

      const models = await getModels(
        `http://localhost:${setting.lmstudio.port}`
      );

      if (models) {
        resolve(!!models.length);
      }
    } catch (err) {
      console.error(err);
      resolve(false);
    }

    setTimeout(() => {
      availablePms = null;
    }, 1000);
  }));
};
