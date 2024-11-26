// 获取本地密钥的相关模块
import { get } from "/packages/fs/handle/index.js";
import {
  generateSignKeyPair,
  pairToString,
  stringToPair,
  getHash,
} from "../util.js";

let publicStr; // 公钥(字符串)

// 初始化并获取自己的签名和加密用的CryptoKey
async function initUserPair() {
  const signPair = await generateSignKeyPair();

  const pairHandle = await get("local/system/user/pair", {
    create: "file",
  });

  const strPair = await pairToString(signPair);

  publicStr = strPair.public;

  await pairHandle.write(JSON.stringify(strPair));

  return signPair;
}

// 从本地文件获取用户数据
const getUserDataFromHandle = async () => {
  const pairHandle = await get("local/system/user/pair", {
    create: "file",
  });

  if (!pairHandle) {
    return null;
  }

  let pairData = await pairHandle.text();

  if (!pairData) {
    return null;
  }

  pairData = JSON.parse(pairData);

  publicStr = pairData.public;

  pairData = await stringToPair(pairData);

  return pairData;
};

// 自己的密钥
const pairData = new Promise(async (resolve) => {
  let pairData = await getUserDataFromHandle();

  if (!pairData) {
    pairData = await initUserPair();
  }

  resolve(pairData);
});

/**
 * 获取本地签名用的对钥，已经转化成 crypto 实例
 * @returns Object
 */
export const getPair = async () => {
  const pair = await pairData;

  // TODO: 要想办法不让外部获取到这个数据
  return pair;
};

/**
 * 获取签名的公钥
 * @returns String
 */
export const getPublic = async () => {
  if (!publicStr) {
    // 等待对钥获取成功，一定能得到公钥
    await pairData;
  }

  return publicStr;
};

/**
 * 获取自己的用户ID
 * @returns String
 */
export const getId = async () => {
  const publicStr = await getPublic();

  return await getHash(publicStr);
};
