import * as util from "./util.js";
export { saveCache } from "./util.js";
import { users, connectUser } from "/packages/connect/user.js";

// 根据key获取值
// 先在本地获取，本地获取不到的情况下，从远端获取
export const fetchCache = async (key, userid) => {
  const result = await util.getCache(key);

  if (result) {
    return result;
  }

  return new Promise((resolve) => {
    let timer;
    let f = () => {
      let targetUsr;

      if (userid) {
        targetUsr = users.find((e) => e.id === userid);
      } else {
        // 向所有用户广播查找
        debugger;
      }

      if (!targetUsr) {
        alert("查找不到用户");
        return;
      }

      // 重新发送缓存请求
      targetUsr._send({
        type: "getCache",
        hashs: [key],
      });

      timer = setTimeout(() => {
        // 4秒内还没搞定，重新发起请求
        f();
      }, 4000);
    };

    util.handCache(key).then((data) => {
      clearTimeout(timer);
      f = null;
      resolve(data);
    });

    f();
  });
};
