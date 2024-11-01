import { get } from "../handle/index.js";
// import { connectUser } from "/packages/connect/user.js";

// 中转所有远程的内容
const bridge = async (options) => {
  const { method, path, args = [] } = options;

  let handle;

  try {
    handle = await get(path);
  } catch (err) {
    return {
      method,
      ok: 0,
      error: err.toString(),
    };
  }

  const result = await handle[method](...args);
  const valueType = getType(result);

  // 返回去的值
  let returnValue = result;

  if (valueType === "AsyncGenerator") {
    returnValue = [];
    for await (let e of result) {
      returnValue.push(e);
    }
  } else {
    // console.log(`method "${method}": `, result, valueType);
  }

  return {
    method,
    valueType,
    value: returnValue,
    ok: 1,
  };
};

const getType = (result) => {
  return Object.prototype.toString
    .call(result)
    .replace(/^\[object (.*)\]$/, "$1");
};

const promiseSaver = new Map();

// 处理转发的数据
export const handleBridge = async (options, userid) => {
  const bid = getRamdId();

  // const user = await connectUser(userid);

  // 将 remoteHandle的运行方法和参数发送到远端
  // user._send({
  //   fs: {
  //     options,
  //     bid,
  //   },
  // });

  debugger;

  // 从远端获取到返回的数据
  const result = await new Promise((resolve, reject) => {
    const clear = () => {
      promiseSaver.delete(bid);
    };

    promiseSaver.set(bid, {
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

  return result.value;
};

// 响应远端的数据
export const reponseBridge = async (result, permissions, send) => {
  if (result.fs) {
    // file system 方法转发内容
    const { options, bid } = result.fs;

    // 返回的主体内容
    let bdResult;

    // 判断权限
    if (!permissions.read && !permissions.write) {
      // 这个用户没有权限登录
      bdResult = {
        error: "permission denied",
      };
    } else {
      bdResult = await bridge(options);
    }

    // 转发函数后的返回值
    send({
      responseFs: {
        bid,
        ...bdResult,
      },
    });
  } else if (result.responseFs) {
    const data = result.responseFs;
    const resolver = promiseSaver.get(data.bid);
    if (data.error) {
      resolver && resolver.reject(new Error(data.error));
    } else {
      resolver && resolver.resolve(data);
    }
  } else {
    // 未处理数据
    console.warn("Unprocessed suspicious data", result);
  }
};

const getRamdId = () => Math.random().toString(32).slice(2);
