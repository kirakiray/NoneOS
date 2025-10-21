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

  // 当 _ignoreCert 为 true 时，跳过公钥验证，此参数主要用于测试环境。
  if (!localUser._ignoreCert && !(await localUser.isMyDevice(fromUserId))) {
    // 记录非自身设备尝试创建连接的错误信息
    console.error(
      `检测到非我的设备尝试建立连接，连接请求已拒绝。请求设备用户 ID: ${fromUserId}`
    );

    server.sendTo(
      {
        userId: fromUserId,
        userSessionId: fromUserSessionId,
      },
      {
        type: "rtc-offer-error",
        message: "非我的设备尝试建立连接，连接请求已拒绝",
        toRTCId: fromRTCId,
        __internal_mark: 1,
      }
    );

    return;
  }

  // 获取目标的远端用户
  const remoteUser = await localUser.connectUser(fromUserId);

  if (!remoteUser.serverState) {
    // serverState 为空，说明用户还没有连接到服务器；但是对方已经发了 offer 了，说明已经在线，这时候要重新查询服务器是否在线
    await remoteUser.checkServer();
  }

  await initRTC(remoteUser, {
    offer,
    fromUserId,
    fromUserSessionId,
    fromRTCId,
  });
}
