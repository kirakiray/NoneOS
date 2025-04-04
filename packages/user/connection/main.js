import { connections } from "./public.js";

import { on } from "../event.js";

on("server-agent-data", (e) => {
  if (e.data.kind === "connect-user") {
    
  }
});

// 连接目标设备
export const connect = async ({ userId }) => {};
