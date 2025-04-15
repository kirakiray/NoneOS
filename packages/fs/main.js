export { get, init } from "./handle/main.js";

// import {
//   get as systemHandleGet,
//   init as systemHandleInit,
// } from "./handle/main.js";

// import { init as cHandleInit, get as cHandleGet } from "./c-handle/main.js";

// // import { init as dbHandleInit, get as dbHandleGet } from "./db-handle/main.js";

// import { isSafari } from "./util.js";

// export const init = async (name) => {
//   return !isSafari ? systemHandleInit(name) : cHandleInit(name);
// };

// // safari 不支持 systemHandle，所以被迫重新实现一个虚拟系统
// export const get = async (path, options) => {
//   return !isSafari ? systemHandleGet(path, options) : cHandleGet(path, options);
// };

// // 全量测试 c-handle
// import { init as cHandleInit, get as cHandleGet } from "./c-handle/main.js";

// export const init = async (name) => {
//   return cHandleInit(name);
// };

// export const get = async (path, options) => {
//   return cHandleGet(path, options);
// };
