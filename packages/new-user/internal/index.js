import { getHash } from "../../fs/util.js";
import initRTC from "../remote/init-rtc.js";

// 内部操作相关的函数
export default {
  async "rtc-offer"({
    fromUserId,
    fromUserSessionId,
    data,
    server,
    localUser,
  }) {
    const { offer, publicKey } = data;

    // 用户用户id是否有被篡改
    const hash = await getHash(publicKey);
    if (hash !== fromUserId) {
      console.error("用户用户id与公钥不匹配");
      // TODO: 应该记录错误日志，太多就要拉入黑名单
      return;
    }

    // 获取目标的远端用户
    const remoteUser = await localUser.connectUser({
      userId: fromUserId,
      fromUserId,
    });

    await initRTC(remoteUser, {
      offer,
    });
  },
  async "rtc-answer"({
    fromUserId,
    fromUserSessionId,
    data,
    server,
    localUser,
  }) {
    debugger;
  },
  async "rtc-ice-candidate"({
    fromUserId,
    fromUserSessionId,
    data,
    server,
    localUser,
  }) {
    debugger;
  },
};
