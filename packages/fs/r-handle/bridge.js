import { get } from "../handle/index.js";
import { connectUser } from "/packages/connect/user.js";
import { splitIntoChunks, calculateHash } from "../handle/util.js";

// 中转所有远程的内容
const bridge = async (options, send) => {
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
    console.log(`method "${method}": `, result, valueType);
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

  // 将 remoteHandle的运行方法和参数发送到远端
  user._send({
    fs: {
      options,
      bid,
    },
  });

  // 从远端获取到返回的数据
  const result = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Get request timeout: ${options.path}`));
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

// 响应远端的数据
export const reponseBridge = async (result, send) => {
  if (result instanceof ArrayBuffer) {
    // 拿出前八个数字，判断是否符合bid
    const bid = arrToHex(Array.from(new Uint8Array(result.slice(0, 8))));

    const resolver = promiseSaver.get(bid);

    if (resolver) {
      resolver.resolve({
        value: result.slice(8),
      });
    }
  } else if (result.fs) {
    // file system 方法转发内容
    const { options, bid } = result.fs;

    const bdResult = await bridge(options);

    if (bdResult.method === "_getBlock") {
      const hex = hexToArr(bid);

      if (!bdResult.value) {
        send(null);
        return;
      }

      // 加上返回的BID
      const newBuffer = prependToArrayBuffer(
        bdResult.value,
        new Uint8Array(hex)
      );

      send(newBuffer);
    } else {
      // 转发函数后的返回值
      send({
        responseFs: {
          bid,
          ...bdResult,
        },
      });
    }
  } else if (result.responseFs) {
    const data = result.responseFs;
    const resolver = promiseSaver.get(data.bid);
    resolver && resolver.resolve(data);
  } else {
    // 未处理数据
    console.warn("Unprocessed suspicious data", result);
  }
};

const getId = () =>
  arrToHex(Array.from({ length: 8 }, () => Math.floor(Math.random() * 256)));

function arrToHex(arr) {
  return arr.map((e) => e.toString(16).padStart(2, "0")).join("");
}

function hexToArr(hexString) {
  const result = [];
  for (let i = 0; i < hexString.length; i += 2) {
    const hexPair = hexString.slice(i, i + 2);
    const decimal = parseInt(hexPair, 16);
    result.push(decimal);
  }
  return result;
}

function prependToArrayBuffer(buffer, data) {
  const newBuffer = new ArrayBuffer(buffer.byteLength + data.byteLength);
  const newView = new Uint8Array(newBuffer);
  newView.set(data, 0);
  newView.set(new Uint8Array(buffer), data.byteLength);
  return newBuffer;
}
