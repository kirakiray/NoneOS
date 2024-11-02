// 初始化核心的方法
import "./cert/init.js";
import "./block/init.js";
import { inited as userInited } from "./user-connect/main.js";
import { inited as serverInited } from "./server-connect/main.js";

export const inited = (async () => {
  await userInited;
  await serverInited;
})();
