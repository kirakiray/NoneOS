import { Stanz } from "../../libs/stanz/main.js";

const connections = {};

globalThis.connections = connections;

export const getConnections = (userDirName) => {
  userDirName = userDirName || "main";
  if (connections[userDirName]) {
    return connections[userDirName];
  }

  return (connections[userDirName] = new Stanz({}));
};

// 注意，不能加上这个逻辑，会导致用户无法再次连接成功，即使已经刷新页面
// window.addEventListener("beforeunload", () => {
//   Object.values(connections).forEach((e) => {
//     e.forEach((connection) => {
//       if (connection.state === "ready") {
//         connection.send({
//           type: "close",
//         });
//       }
//     });
//   });
// });
