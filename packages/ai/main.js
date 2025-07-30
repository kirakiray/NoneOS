
export {
  getOllamaModels,
  deleteOllamaModel,
  pullOllamaModel,
  askOllamaStream,
} from "./ollama.js";

export { modelExtend, ask } from "./ask.js";

import { getOllamaModels } from "./ollama.js";

let availablePms = null;

export const isAIAvailable = async () => {
  if (availablePms) {
    return availablePms;
  }

  return (availablePms = new Promise(async (resolve, reject) => {
    try {
      const models = await getOllamaModels();

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
