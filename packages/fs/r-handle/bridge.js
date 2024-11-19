import { get } from "../handle/index.js";
import { users } from "/packages/core/user-connect/main.js";
import { userMiddleware, on } from "../../core/main.js";
import { RemoteDirHandle } from "./dir.js";
import { RemoteFileHandle } from "./file.js";
import { saveData, getData } from "../../core/block/main.js";
import { CHUNK_REMOTE_SIZE } from "../util.js";

// 暂存器
const pmSaver = new Map();

// 用户关闭时，将相关的 promiser 全部 reject
on("user-closed", ({ data }) => {
  const targetUser = data.target;

  Array.from(pmSaver.entries()).map(([key, pmser]) => {
    const userId = key.split("--")[1];

    if (targetUser.userId === userId) {
      pmser.reject(
        new Error(
          `User connection interrupted:${targetUser.userName}(${userId})`
        )
      );
    }
  });
});

// 文件函数中转器
export const bridge = async (options) => {
  const pathArr = options.path.split(":");
  const userId = pathArr[1];

  // 当调用中断时使用的对象
  let causeErr;
  try {
    // 抛出一个错误以捕获当前的调用栈
    throw new Error(`Failed to bridge data: (${userId})`);
  } catch (e) {
    // 保存一份带有调用栈的错误对象
    causeErr = e;
  }

  // 去除前缀只保留路径
  const fixedPath = pathArr.slice(2).join("/");

  // 查找目标并发送获取用户的请
  const targetUser = users.find((user) => user.userId === userId);

  if (targetUser) {
    targetUser.connect();

    // 等待连接完成
    await targetUser.watchUntil(() => targetUser.state === "connected");

    const bid = getRandomId() + `--${targetUser.userId}`;

    let finnalData = {
      ...options,
      type: "fs-bridge", // 远端 file system 桥接
      path: fixedPath,
      bid,
    };

    finnalData = JSON.stringify(finnalData);

    if (finnalData.length < CHUNK_REMOTE_SIZE) {
      // 发送查询信息
      await targetUser.send(finnalData);
    } else {
      // 大于最大区块的时候，通过转发的模式进行转发
      // 写到缓存区，让对面来获取
      const hashs = await saveData({
        data: finnalData,
        reason: "big-data",
        path: fixedPath,
        userId: targetUser.userId,
      });

      targetUser.send({
        type: "bridge-big-data",
        hashs,
      });
    }

    // 从远端获取到返回的数据
    const result = await new Promise((resolve, reject) => {
      const clear = () => {
        pmSaver.delete(bid);
      };

      pmSaver.set(bid, {
        resolve(data) {
          resolve(data);
          clear();
        },
        reject(err) {
          causeErr.cause = err;
          reject(causeErr);
          clear();
        },
      });
    });

    if (result._AsyncGenerator) {
      return arrayToAsyncGenerator(
        result.value.map((e) => {
          return dataToHandle(e, options.path);
        })
      );
    }

    return dataToHandle(result.value, options.path);
  }
};

// 中转响应文件
userMiddleware.set("fs-bridge", async (data, client) => {
  const { method, path, bid, args } = data;

  try {
    const targetHandle = await get(path);

    // 临时添加用户信息
    targetHandle.__remote_user = client.userId;

    // 实际运行后要返回的值
    const reValue = await targetHandle[method](...args);

    delete targetHandle.__remote_user;

    // 返回的对象
    const result = {};

    if (isAsyncGenerator(reValue)) {
      // 转化内部数据
      result.value = [];
      result._AsyncGenerator = 1;
      for await (let item of reValue) {
        result.value.push(handleToData(item));
      }
    } else {
      result.value = handleToData(reValue);
    }

    const needSendData = JSON.stringify({
      type: "fs-bridge-response",
      bid,
      result,
    });

    if (needSendData.length < CHUNK_REMOTE_SIZE) {
      client.send(needSendData);
      return;
    }

    // 提前转换对象
    // 存到数据库，等待对方领取
    const hashs = await saveData({
      data: needSendData,
      reason: "fs-bridge-data",
      path,
      userId: client.userId,
    });

    // 让对方用中转响应转化并接受数据
    client.send({
      type: "bridge-big-data",
      hashs,
    });
  } catch (err) {
    console.error(err);
    client.send({
      type: "fs-bridge-response",
      bid,
      error: err.stack || err.toString(),
    });
  }
});

// 当转发的数据过大，就会通过大文件转发模式进行转发
userMiddleware.set("bridge-big-data", async (data, client) => {
  const { hashs } = data;

  const bufferData = await getData({
    hashs,
    userId: client.userId, // 从指定用户上获取数据
    reason: "bridge-big-data",
  });

  // 还原回对象数据
  const decoder = new TextDecoder("utf-8");
  const stringData = decoder.decode(bufferData);
  const finnalData = JSON.parse(stringData);

  const midFunc = userMiddleware.get(finnalData.type);

  if (!midFunc) {
    // TODO: 不存在的中间件
    debugger;
    console.error(`Middleware does not exist: ` + finnalData.type);
    return;
  }

  midFunc(finnalData, client);
});

// 响应文件请求
userMiddleware.set("fs-bridge-response", async (data, client) => {
  const { bid, error } = data;

  const { result } = data;
  const { resolve, reject } = pmSaver.get(bid);

  if (error) {
    reject(new Error(error));
    return;
  }

  resolve(result);
});

const getRandomId = () => Math.random().toString(32).slice(2);

function isAsyncGenerator(obj) {
  return (
    obj &&
    typeof obj[Symbol.asyncIterator] === "function" &&
    obj.toString() === "[object AsyncGenerator]"
  );
}

async function* arrayToAsyncGenerator(array) {
  for (const item of array) {
    yield item;
  }
}

// 将本地的handle实例转化为远端的handle对象数据
const handleToData = (item) => {
  if (Array.isArray(item)) {
    return item.map(handleToData);
  }

  if (item && (item._mark === "db" || item._mark === "remote")) {
    return {
      __handle: 1,
      //   name: item.name,
      kind: item.kind,
      path: item.path,
      createTime: item.createTime,
      lastModified: item.lastModified,
    };
  }

  return item;
};

// 将远端的handle对象数据转化为本地的handle实例
const dataToHandle = (item, parentPath) => {
  if (Array.isArray(item)) {
    return item.map(handleToData);
  }

  if (!(item instanceof Object)) {
    return item;
  }

  const { __handle, kind, ...info } = item;
  if (__handle) {
    const path = `${parentPath.split("/")[0]}/${item.path
      .split("/")
      .slice(1)
      .join("/")}`;

    if (kind === "dir") {
      return new RemoteDirHandle({
        path,
        bridge,
        info,
      });
    } else {
      return new RemoteFileHandle({
        path,
        bridge,
        info,
      });
    }
  }

  return item;
};
