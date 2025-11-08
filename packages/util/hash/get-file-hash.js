import { getFileChunkHashes } from "./get-file-chunk-hashes.js";
import { getHash } from "./get-hash.js";

/**
 * 获取文件的总体哈希值
 * @param {File} file - 要计算哈希的文件对象
 * @returns {Promise<string>} 返回文件的总体哈希值
 * @description 将文件分割成128kb大小的块，计算每个块的SHA-256哈希值，
 *             然后将所有块的哈希值拼接成字符串，最后计算这个字符串的哈希值作为文件的总体哈希值
 */
export const getFileHash = async (file) =>
  getHash((await getFileChunkHashes(file, { chunkSize: 128 * 1024 })).join(""));
