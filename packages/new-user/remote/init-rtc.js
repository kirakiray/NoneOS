export default async function initRTC(remoteUser) {
  if (remoteUser.serverState === 0) {
    throw new Error("未找到合适的握手服务器");
  }

  debugger;
}
