import { initUserPair } from "./util.js";

export async function createUser() {
  const pairData = await initUserPair();

  console.log("pairData: ", pairData);
}

export const getUserInfo = async () => {
  const { signPublic, encryPublic, id } = await initUserPair();

  return {
    userID: id,
    userName: localStorage.__username,
    backupUserName: `user-${id.slice(29, 35)}`,
    signPublic,
    encryPublic,
  };
};
