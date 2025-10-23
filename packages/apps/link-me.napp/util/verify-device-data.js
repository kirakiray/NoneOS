import { getHash } from "../../../fs/util.js";
import { verify } from "../../../new-user/util/verify.js";

export async function verifyDeviceData(receivedData, localUser) {
  const verificationResult = await verify(receivedData);

  if (!verificationResult) {
    // TODO: 验证失败，提示用户可能有攻击
    throw new Error("用户卡片签名错误，可能有攻击");
  }

  const receivedUserId = await getHash(receivedData.publicKey);

  if (receivedUserId !== receivedData.userId) {
    // TODO: 用户ID不匹配，提示用户可能有攻击
    throw new Error("用户ID不匹配，可能有攻击");
  }

  // 验证证书内容是否正确
  const deviceCertificate = receivedData.cert;

  const certificateVerificationResult = await verify(deviceCertificate);

  if (!certificateVerificationResult) {
    // TODO: 验证失败，提示用户可能有攻击
    throw new Error("证书签名错误，可能有攻击");
  }

  const certificatePublicKeyHash = await getHash(deviceCertificate.publicKey);

  if (
    certificatePublicKeyHash !== deviceCertificate.issuedBy ||
    certificatePublicKeyHash !== receivedUserId
  ) {
    // TODO: 用户ID不匹配，提示用户可能有攻击
    throw new Error("用户ID不匹配，可能有攻击");
  }

  if (deviceCertificate.issuedTo !== localUser.userId) {
    // TODO: 用户ID不匹配，提示用户可能有攻击
    throw new Error("不是授权给我的设备证书，可能有攻击");
  }

  return true;
}
