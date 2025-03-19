import { createVerifier } from "./util.js";

// 验证数据
export const verifyData = async ({ data, signature }) => {
  const { publicKey } = data;

  // 生成验证器
  const verify = await createVerifier(publicKey);

  try {
    // 将 base64 转换回原始格式并验证签名
    const signatureBuffer = new Uint8Array(
      [...atob(signature)].map((c) => c.charCodeAt(0))
    ).buffer;

    const result = await verify(JSON.stringify(data), signatureBuffer);

    return {
      result,
      data: data.origin,
    };
  } catch (err) {
    // base64转换失败时返回验证失败结果
    return {
      result: false,
      data: data.origin,
      error: "Invalid base64 signature",
    };
  }
};
