import {
  get as systemHandleGet,
  init as systemHandleInit,
} from "./handle/main.js";

export const init = async (name) => {
  return systemHandleGet(name);
};

export const get = async (path, options) => {
  return systemHandleInit(path, options);
};
