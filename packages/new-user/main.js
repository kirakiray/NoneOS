import { get, init } from "/packages/fs/handle/main.js";
import { User } from "./user.js";
import { LocalUser } from "./local-user.js";

// 创建用户数据
export const createUser = async (opts) => {
  const options = {
    user: "main",
    // publicKey:""
  };

  Object.assign(options, opts);

  let user;

  if (options.publicKey) {
    user = new User(options.publicKey);
  } else {
    await init("system");

    const userDirHandle = await get(`system/user/${options.user}`, {
      create: "dir",
    });

    user = new LocalUser(userDirHandle);
  }

  await user.init();

  return user;
};
