import { get as handleGet, init as handleInit } from "./handle/main.js";

export const init = async (name) => {
  return handleGet(name);
};

export const get = async (path, options) => {
  return handleInit(path, options);
};
