import { getServers, addServer, removeServer } from "./hand-server/main.js";
import { getUserStore } from "./user-store.js";
import { getDevices } from "./device/main.js";
import { on } from "./event.js";

export { getServers, addServer, removeServer, getUserStore, getDevices, on };

// 添加 tabSessionID
export const tabSessionid = Math.random().toString(36).slice(2);
