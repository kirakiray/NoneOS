import fs from "fs/promises";
import { getFilesAndHashes } from "./get-files-and-hashes.js";
import {
  stringToPair,
  dataToArrayBuffer,
  arrayBufferToBase64,
} from "../packages/core/util.js";

(async () => {
  try {
    let pgjson = await fs.readFile("./package.json", "utf-8");
    pgjson = JSON.parse(pgjson);

    const files = await getFilesAndHashes("./packages");

    const data = {
      files,
      version: pgjson.version,
    };

    // 读取开发用签名公钥
    let pair = await fs.readFile("./rootkeys/root.json", "utf-8");
    pair = JSON.parse(pair);
    const pairData = await stringToPair(pair);

    // 签名data数据
    console.log(pairData);

    const signature = await sign(data, pairData);

    // 写入得到的数据
    await fs.writeFile(
      "./files.json",
      JSON.stringify({
        data,
        signature,
      })
    );

    // console.log(files);
  } catch (err) {
    console.error(err);
  }
})();

/**
 * 使用自身的密钥，给数据进行签名，并返回签名后的内容
 * @param {String|Object} message 需要签名的数据
 * @returns 签名字符串
 */
export async function sign(message, pair) {
  let data = dataToArrayBuffer(message);

  // 使用私钥进行签名
  const signature = await crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" },
    },
    pair.privateKey,
    data
  );

  return arrayBufferToBase64(signature);
}
