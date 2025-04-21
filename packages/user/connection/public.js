import { Stanz } from "../../libs/stanz/main.js";

const connections = {};

export const getConnections = (userDirName) => {
  userDirName = userDirName || "main";
  if (connections[userDirName]) {
    return connections[userDirName];
  }

  return (connections[userDirName] = new Stanz({}));
};
