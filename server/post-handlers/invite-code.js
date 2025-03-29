// 邀请码对应的用户
const invites = new Map();

export default {
  handler: async (requestBody, client) => {
    if (requestBody.setInviteCode) {
      if (client.__inviteCode && invites.get(client.__inviteCode) === client) {
        // 已经设置过邀请码，删除旧的
        invites.delete(client.__inviteCode);
      }

      const inviteCode = requestBody.setInviteCode;

      if (invites.get(inviteCode)) {
        throw new Error("邀请码已被使用: " + inviteCode);
      }

      const code = (client.__inviteCode = inviteCode);

      invites.set(code, client);

      // 监听删除
      client._webSocket.on("close", () => {
        if (invites.get(code) === client) {
          invites.delete(code);
        }
      });

      return {
        setInviteCode: true,
        id: client._userId,
      };
    }

    if (requestBody.setInviteCode === 0) {
      // 清空邀请码
      if (client.__inviteCode && invites.get(client.__inviteCode) === client) {
        // 已经设置过邀请码，删除旧的
        invites.delete(client.__inviteCode);
        client.__inviteCode = undefined;
      }
    }

    if (requestBody.findInviteCode) {
      const inviteCode = requestBody.findInviteCode;
      const inviteClient = invites.get(inviteCode);
      if (!inviteClient) {
        throw new Error("邀请码不存在");
      }
      return {
        findInviteCode: true,
        id: inviteClient._userId,
        authedData: inviteClient.authedData,
      };
    }

    // client.__inviteCode = requestBody.inviteCode;

    return {
      test: 200,
    };
  },
};
