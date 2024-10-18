import { get } from "/packages/fs/handle/index.js";
import { ServerConnector } from "./connector.js";

// 所有存放的服务器
export const servers = $.stanz([]);

setTimeout(async () => {
  const serverFile = await getServerFile();

  let data = await serverFile.text();
  data = JSON.parse(data);

  data.forEach((serverInfo) => {
    const connector = new ServerConnector(serverInfo);
    servers.push(connector);
  });

  if (!servers.length && location.host.includes("localhost")) {
    // 添加测试服务器
    addServer("http://localhost:5569/user");
  }
}, 100);

export const removeServer = async (serverUrl) => {
  const index = servers.findIndex((e) => e.serverUrl === serverUrl);

  if (index > 0) {
    servers.splice(index, 1);

    await saveServer();
  }
};

export const addServer = (serverUrl) => {
  // 检测连接是否正确
  if (!validateURL(serverUrl)) {
    return new Error(`The server url format is incorrect`);
  }

  // 查看是否重复
  if (servers.some((e) => e.serverUrl === serverUrl)) {
    return new Error(`The server url is repeated`);
  }

  const connector = new ServerConnector({
    serverUrl,
  });

  servers.push(connector);

  if (isSave) {
    saveServer();
  }
};

function validateURL(url) {
  const regex =
    /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\*\+,;=.]+$/;

  // const regex = /https?:\/\/\S+/;
  return regex.test(url);
}

// 保存服务器数据
const saveServer = async () => {
  const datas = servers.map((e) => {
    return {
      serverName: e.serverName,
      serverUrl: e.serverUrl,
    };
  });

  const serverFile = await getServerFile();

  await serverFile.write(JSON.stringify(datas));
};

// 获取存放服务器列表的文件
const getServerFile = (() => {
  let serverFilePms;
  return async () => {
    if (serverFilePms) {
      return await serverFilePms;
    }
    serverFilePms = get("local/system/servers", { create: "file" });
    return await serverFilePms;
  };
})();
