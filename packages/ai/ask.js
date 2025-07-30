import { getAISetting } from "./custom-data.js";
import { askOllamaStream } from "./ollama.js";

export const modelExtend = {
  "qwen3:4b": {
    prepare(prompt) {
      return `/no_think${prompt}`;
    },
    preprocess(responseText) {
      if (!/<think>[\d\D]*?<\/think>\n/.test(responseText)) {
        return "";
      }

      return responseText.replace(/^\<think>[\d\D]*?<\/think>\s+/, "");
    },
  },
};

const tasks = [];

let runningCount = 0; // 正在运行的AI个数

const runTask = () => {
  const task = tasks.shift();

  const { prompt, options, resolve, reject } = task;

  runningCount++;

  askByLocalOllama(prompt, options)
    .then((res) => {
      runningCount--;
      resolve(res);
    })
    .catch((err) => {
      runningCount--;
      reject(err);
    });
};

export const ask = (prompt, options) => {
  return new Promise((resolve, reject) => {
    // 先加入队列，等待处理
    tasks.push({
      prompt,
      options,
      resolve,
      reject,
    });

    if (runningCount <= 0) {
      runTask();
    }
  });
};

// 对内容进行提问
export const askByLocalOllama = async (
  prompt,
  { model: modelName, onChunk }
) => {
  const aiSettingData = await getAISetting();

  let responseText = "";

  let finalModelName = modelName || aiSettingData.ollama.model || "qwen3:4b";

  const targetExtend = modelExtend[finalModelName];

  // 针对不同模型的预处理
  if (targetExtend) {
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
