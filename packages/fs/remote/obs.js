import { on } from "../../user/event.js";
import { get } from "../handle/main.js";
import { localRemoteObsPool } from "./base.js";

export const observerStorage = {};

export const getObserverData = ({ fromUserId, useLocalUserDirName }) => {
  useLocalUserDirName = useLocalUserDirName || "main";
  let observerList = observerStorage[`${useLocalUserDirName}-${fromUserId}`];

  if (!observerList) {
    observerList = observerStorage[`${useLocalUserDirName}-${fromUserId}`] = [];
  }

  return observerList;
};

on("receive-user-data", async (e) => {
  const {
    useLocalUserDirName, // 目标本地用户目录名称
    fromUserId, // 消息来源用户ID
    // fromTabId, // 消息来源TabID
    tabConnection, // 消息来源TabConnection
  } = e;

  let { data } = e;

  const { kind } = data;

  if (kind === "obs-fs") {
    // 观察文件变动
    const obsArr = getObserverData({
      fromUserId,
      useLocalUserDirName,
    });

    if (!tabConnection.__obs_cancel) {
      // 当整个连接关闭时，取消所有文件监听
      const obsLinsten = (tabConnection.__obs_cancel = () => {
        debugger;

        // 关闭连接，取消所有文件监听
        obsArr.forEach((e) => {
          e.cancel();
        });

        tabConnection.__obs_cancel = null;
      });

      tabConnection.whenClosed(obsLinsten);
    }

    try {
      const handle = await get(data.path);

      const cancel = await handle.observe((...args) => {
        // 发送文件变动通知
        tabConnection.send({
          kind: "obs-fs-callback",
          path: data.path,
          itemId: data.itemId,
          args,
        });
      });

      // 记录观察路径
      obsArr.push({
        path: data.path,
        itemId: data.itemId,
        cancel,
      });

      tabConnection.send({
        kind: "user-result",
        taskId: data.taskId,
        result: true,
      });
    } catch (error) {
      tabConnection.send({
        kind: "user-result",
        taskId: data.taskId,
        error: error.stack || error.toString(),
      });
    }
  } else if (kind === "un-obs-fs") {
    // 观察文件变动
    const obsArr = getObserverData({
      fromUserId,
      useLocalUserDirName,
    });

    const targetIndex = obsArr.findIndex((e) => e.itemId === data.itemId);

    // 取消观察
    if (targetIndex > -1) {
      obsArr[targetIndex].cancel();
      obsArr.splice(targetIndex, 1);
    }

    // 返回结果
    tabConnection.send({
      kind: "user-result",
      taskId: data.taskId,
      result: true,
    });
  } else if (kind === "obs-fs-callback") {
    const targetItem = localRemoteObsPool.get(data.itemId);

    const arg0 = data.args[0];

    // 修正地址
    arg0.path = arg0.path.replace(targetItem.path, targetItem.finnalPath);

    targetItem &&
      targetItem.func({
        ...arg0,
      });
  }
});
