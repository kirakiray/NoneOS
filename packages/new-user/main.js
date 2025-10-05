import { get, init } from "/packages/fs/handle/main.js";
import { BaseUser } from "./base-user.js";
import { LocalUser } from "./local-user.js";

const localUsers = {};

// 创建用户数据
export const createUser = async (opts) => {
  const options = {
    user: "main",
    // publicKey:""
  };

  Object.assign(options, opts);

  if (options.publicKey) {
    const user = new BaseUser(options.publicKey);
    await user.init();
    return user;
  }

  if (localUsers[options.user]) {
    return localUsers[options.user];
  }

  return (localUsers[options.user] = (async () => {
    await init("system");

    const userDirHandle = await get(`system/user/${options.user}`, {
      create: "dir",
    });

    const user = new LocalUser(userDirHandle);

    localUsers[options.user] = user;

    await user.init();

    return user;
  })());
};
