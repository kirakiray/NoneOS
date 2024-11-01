import { get } from "../handle/index.js";
import { users } from "/packages/core/user-connect/main.js";
import { userMiddleware } from "../../core/main.js";
import { RemoteDirHandle } from "./dir.js";
import { RemoteFileHandle } from "./file.js";

// 暂存器
const pmSaver = new Map();

// 文件函数中转器
export const bridge = async (options) => {
  const pathArr = options.path.split(":");
  const userId = pathArr[1];

  // 去除前缀只保留路径
  const fixedPath = pathArr.slice(2).join("/");

  // 查找目标并发送获取用户的请
  const targetUser = users.find((user) => user.userId === userId);

  if (targetUser) {
    targetUser.connect();

    // 等待连接完成
    await targetUser.watchUntil(() => targetUser.state === "connected");

    const bid = getRandomId();

    // 发送查询信息
    await targetUser.send({
      type: "fs-bridge", // 远端 file system 桥接
      options: {
        ...options,
        path: fixedPath,
        bid,
      },
    });

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
        reject(data) {
          reject(data);
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
  const { options } = data;
  const { method, path, bid, args } = options;

  try {
    const targetHandle = await get(path);

    const result = await targetHandle[method](...args);

    // 返回的对象
    const reObj = {
      //   value: result,
    };

    if (isAsyncGenerator(result)) {
      // 转化内部数据
      reObj.value = [];
      reObj._AsyncGenerator = 1;
      for await (let item of result) {
        reObj.value.push(handleToData(item));
      }
    } else {
      reObj.value = handleToData(result);
    }

    client.send({
      type: "fs-bridge-response",
      options: {
        ...options,
        bid,
        result: reObj,
      },
    });
  } catch (err) {
    debugger;

    client.send({
      type: "fs-bridge-response",
      options: {
        bid,
        error: err.toString(),
      },
    });
  }
});

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

// 响应文件请求
userMiddleware.set("fs-bridge-response", async (data, client) => {
  const { options } = data;
  const { result, bid, error } = options;

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
