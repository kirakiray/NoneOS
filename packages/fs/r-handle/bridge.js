import { get } from "../handle/index.js";
import { connectUser } from "/packages/connect-new/user.js";
import { BaseHandle } from "../handle/base.js";

// 中转所有远程的内容
export const bridge = async (options) => {
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

  let returnValue = result;

  if (valueType === "AsyncGenerator") {
    returnValue = [];
    for await (let e of result) {
      returnValue.push(e);
    }
  } else {
    console.log("unknow method", method, result);
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
  const bid = getId();

  const user = await connectUser(userid);

  user._send({
    fs: {
      options,
      bid,
    },
  });

  // 从远端获取到返回的数据
  const result = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Get request timeout: ${path}`));
      clear();
    }, 10000);

    const clear = () => {
      clearTimeout(timer);
      promiseSaver.delete(bid);
    };

    promiseSaver.set(bid, {
      resolve(data) {
        resolve(data);
        clear();
      },
      reject() {
        reject(data);
        clear();
      },
    });
  });

  return result.value;
};

const getId = () => Math.random().toString(32).slice(2);

// 远程响应的数据
export const reponseData = (data, user) => {
  const resolver = promiseSaver.get(data.bid);

  if (!resolver) {
    debugger;
  }

  resolver.resolve(data);
};
