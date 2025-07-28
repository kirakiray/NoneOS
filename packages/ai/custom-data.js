import { createData } from "../hybird-data/main.js";
import { get } from "../fs/main.js";

const aiPms = {};

// 获取ai配置
export const getAISetting = ({ useLocalUserDirName = "main" } = {}) => {
  useLocalUserDirName = useLocalUserDirName || "main";

  return (aiPms[useLocalUserDirName] = (async () => {
    const settingDir = await get(`system/ai/${useLocalUserDirName}`, {
      create: "dir",
    });

    const aiSettingData = await createData(settingDir);

    // 调整数据
    if (!aiSettingData.ollama) {
      aiSettingData.ollama = {
        model: "qwen3:4b", // 设置默认模型
      };
    }

    return aiSettingData;
  })());
};
