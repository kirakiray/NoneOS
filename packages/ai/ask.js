import { getAISetting } from "./custom-data.js";
import { askOllamaStream } from "./ollama.js";

let taskQueue = [];

let activeAICount = 0; // 正在运行的AI个数

const executeTask = () => {
  const currentTask = taskQueue.shift();

  const { prompt, options, resolve, reject } = currentTask;

  activeAICount++;

  askByLocalOllama(prompt, options || {})
    .then((result) => {
      activeAICount--;
      resolve(result);
    })
    .catch((error) => {
      activeAICount--;
      console.error(error);
      reject(error);
    })
    .finally(() => {
      if (taskQueue.length > 0) {
        executeTask();
      }
    });
};

export const clearAsk = (id) => {
  if (!id) {
    return;
  }

  taskQueue = taskQueue.filter((task) => {
    const { options } = task;

    return options.id !== id;
  });
};

export const ask = (prompt, options) => {
  return new Promise((resolve, reject) => {
    // 先加入队列，等待处理
    taskQueue.push({
      prompt,
      options,
      resolve,
      reject,
    });

    if (activeAICount <= 0) {
      executeTask();
    }
  });
};

export const modelExtend = {
  "qwen3:4b": {
    // prepare(prompt) {
    //   return `/no_think${prompt}`;
    // },
    preprocess(responseText) {
      if (!/<think>[\d\D]*?<\/think>\n/.test(responseText)) {
        return "";
      }

      return responseText.replace(/^\<think>[\d\D]*?<\/think>\s+/, "");
    },
  },
};

// 对内容进行提问
export const askByLocalOllama = async (
  prompt,
  { model: modelName, onChunk }
) => {
  const aiSettingData = await getAISetting();

  let responseText = "";

  let finalModelName =
    modelName || aiSettingData.ollama.model || "qwen3:4b-instruct";

  const targetExtend = modelExtend[finalModelName];

  // 针对不同模型的预处理
  if (targetExtend && targetExtend.prepare) {
    prompt = targetExtend.prepare(prompt);
  }

  // 调用ollama的stream接口
  await askOllamaStream(prompt, finalModelName, (chunk) => {
    responseText += chunk;

    let preprocessedText = responseText;
    if (targetExtend && targetExtend.preprocess) {
      preprocessedText = targetExtend.preprocess(responseText);
    }

    if (onChunk) {
      onChunk({
        modelName: finalModelName,
        originText: responseText,
        responseText: preprocessedText,
        currentToken: chunk,
      });
    }
  });

  let preprocessedText = responseText;
  if (targetExtend && targetExtend.preprocess) {
    preprocessedText = targetExtend.preprocess(responseText);
  }

  return {
    modelName: finalModelName,
    originText: responseText,
    responseText: preprocessedText,
  };
};
