import { User } from "../public-user.js";
import { ClientUser } from "./client-user.js";
import { connectors } from "./server-connector.js";
import { clients } from "./public.js";
export { bind } from "./public.js";

// 连接用户
export const linkUser = async (data, dataSignature) => {
  const userData = new User(data, dataSignature);

  let targetCUser = clients.get(userData.userID);

  if (!targetCUser) {
    targetCUser = new ClientUser(data, dataSignature);

    targetCUser.connect();

    clients.set(targetCUser.id, targetCUser);
  }

  return targetCUser;
};

export const getServers = () => {
  return [...connectors];
};
