import { getHash } from "../../fs/util.js";
import initRTC from "../remote/init-rtc.js";

export default async function rtcOfferHandler({
  fromUserId,
  fromUserSessionId,
  data,
  server,
  localUser,
}) {
  const { offer, publicKey, fromRTCId } = data;

  // 用户用户id是否有被篡改
  const hash = await getHash(publicKey);
  if (hash !== fromUserId) {
    console.error("用户用户id与公钥不匹配");
    // TODO: 应该记录错误日志，太多就要拉入黑名单
    return;
  }

  // TODO: 检查是否自己的设备，不是的话不能创建连接

  // 获取目标的远端用户
  const remoteUser = await localUser.connectUser({
    userId: fromUserId,
    fromUserId,
  });

  await initRTC(remoteUser, {
    offer,
    fromUserId,
    fromUserSessionId,
    fromRTCId,
  });
}