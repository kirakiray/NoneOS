import { getUserCard } from "../usercard.js";
import { ClientUser } from "./client-user.js";
import { bind, clients } from "./public.js";

// 所有可用的用户
export const connecteds = $.stanz([]);

// 连接用户
export const connectUser = async (userId) => {
  const cards = await getUserCard();

  const targetUser = cards.find((e) => e.id === userId);

  if (!targetUser) {
    throw new Error(`not found usercard: ${userId}`);
  }

  const user = new ClientUser(targetUser.data, targetUser.dataSignature);

  await user.connect();

  clients.set(user.id, user);
};

// 用户状态信息变化修正
bind("user-state-change", (e) => {
  const { originTarget: targetUser } = e;

  const targetIndex = connecteds.findIndex((e) => e.userID === targetUser.id);
  let targetItem = connecteds[targetIndex];

  if (!targetItem) {
    connecteds.push({
      userID: targetUser.id,
      userName: targetUser.name,
      _user: targetUser,
    });

    targetItem = connecteds.find((e) => e.userID === targetUser.id);
  }

  // 更新状态
  targetItem.state = targetUser.state;
});
