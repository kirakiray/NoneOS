// 初始化核心的方法
import "./cert/init.js";
import "./block/init.js";
import "./user-connect/init.js";
import { inited as userInited } from "./user-connect/main.js";
import { inited as serverInited } from "./server-connect/main.js";
import { inited as iceInited } from "./ice-server.js";

export const inited = (async () => {
  await userInited;
  await serverInited;
  await iceInited;

  await new Promise((res) => setTimeout(res, 100)); // TODO: 应该是等待用户初始化完成后
})();
