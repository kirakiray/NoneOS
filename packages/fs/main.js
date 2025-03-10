import {
  get as systemHandleGet,
  init as systemHandleInit,
} from "./handle/main.js";

import { init as dbHandleInit, get as dbHandleGet } from "./db-handle/main.js";
import { isSafari } from "./util.js";

export const init = async (name) => {
  return !isSafari ? systemHandleInit(name) : dbHandleInit(name);
};

export const get = async (path, options) => {
  return !isSafari
    ? systemHandleGet(path, options)
    : dbHandleGet(path, options);
};
