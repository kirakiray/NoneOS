import {
  get as systemHandleGet,
  init as systemHandleInit,
} from "./handle/main.js";

export const init = async (name) => {
  return await systemHandleInit(name);
};

export const get = async (path, options) => {
  return await systemHandleGet(path, options);
};
