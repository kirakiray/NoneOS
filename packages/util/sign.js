// 使用本地密钥进行签名的相关模块
import {
  dataToArrayBuffer,
  arrayBufferToBase64,
  getHash,
} from "/packages/user/util.js";
import { getPair, getPublic } from "./pair.js";

/**
 * 使用自身的密钥，给数据进行签名，并返回签名后的内容
 * @param {String|Object} message 需要签名的数据
 * @returns 签名字符串
 */
export const sign = async (message) => {
  let data = dataToArrayBuffer(message);

  const pair = await getPair();

  const arrayData = await crypto.subtle.sign(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    pair.privateKey,
    data
  );

  return arrayBufferToBase64(arrayData);
};

/**
 * 用自身的私钥对数据进行签名，并返回封装的数据和签名
 * @param {Object} options 要签名的数据
 * @returns Object 封装好的数据和签名的对象
 */
export const signData = async (options) => {
  //   options = {
  //     authTo: ""
  //     expire: "never", // 过期时间
  //     permission: "", // 权限类型
  //   };

  const publicSignStr = await getPublic();

  // 签名数据
  const data = [
    ["authTo", options.authTo],
    ["expire", options.expire],
    ["permission", options.permission],
    ["issuer", await getHash(publicSignStr)],
    ["signPublic", publicSignStr],
    ["creation", Date.now()],
  ];

  return {
    data,
    sign: await sign(data),
  };
};
