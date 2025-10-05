import { get, init } from "/packages/fs/handle/main.js";
import { BaseUser } from "./base-user.js";
import { LocalUser } from "./local-user.js";

const localUsers = {};

// 创建用户数据
export const createUser = (opts) => {
  const options = {
    user: "main",
    // publicKey:""
  };

  Object.assign(options, opts);

  if (localUsers[options.user]) {
    return localUsers[options.user];
  }

  return (localUsers[options.user] = (async () => {
    let user;

    if (options.publicKey) {
      user = new BaseUser(options.publicKey);
    } else {
      await init("system");

      const userDirHandle = await get(`system/user/${options.user}`, {
        create: "dir",
      });
      user = new LocalUser(userDirHandle);

      localUsers[options.user] = user;
    }

    await user.init();

    return user;
  })());
};
