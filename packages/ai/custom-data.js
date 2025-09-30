import { createData } from "../hybird-data/main.js";
import { get } from "../fs/main.js";
import { getSetting } from "../none-os/setting.js";

const aiPms = {};

// 获取ai配置
export const getAISetting = ({ useLocalUserDirName = "main" } = {}) => {
  useLocalUserDirName = useLocalUserDirName || "main";

  if (aiPms[useLocalUserDirName]) {
    return aiPms[useLocalUserDirName];
  }

  return (aiPms[useLocalUserDirName] = (async () => {
    const settingFile = await get(`system/ai/${useLocalUserDirName}.json`, {
      create: "file",
    });

    const aiSettingData = await createData(settingFile);

    if (!aiSettingData.userPreferences) {
      // 专门给AI食用的用户偏好
      const settingData = await getSetting();

      aiSettingData.userPreferences = {
        lang: {
          // 用户的偏好语言
          value: settingData.lang,
          explain: "The user's preferred language",
        },
      };
    }

    return aiSettingData;
  })());
};
