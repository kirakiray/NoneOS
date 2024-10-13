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
      // 重新发送数据
      users[0]._send({
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
