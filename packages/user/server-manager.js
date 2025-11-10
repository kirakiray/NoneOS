import { createSingleData } from "../hybird-data/single-data.js";

export class ServerManager {
  #self;
  #data;
  #dirHandle;
  #xdata;
  constructor(user, dirHandle) {
    this.#self = user;
    this.#dirHandle = dirHandle;
  }

  async init() {
    const serversHandle = await this.#dirHandle.get("servers.json", {
      create: "file",
    });

    const serversData = await createSingleData({
      handle: serversHandle,
      disconnect: false,
    });

    this.#data = serversData;

    if (!serversData.length) {
      await this.reset();
    }
  }

  get data() {
    return this.#data;
  }

  // 获取stanz格式的数据列表
  // 这个列表会自动更新数据，不需要手动更新
  //
  async xdata() {
    if (this.#xdata) {
      return this.#xdata;
    }

    this.#xdata = $.stanz([]);

    // 获取服务器列表
    const serverManager = await this.#self.serverManager();

    serverManager.data.forEach(async ({ url }) => {
      const server = await this.#self.connectServer(url, {
        waitForAuthed: false,
      });

      const item = $.stanz({
        name: "unknown", // 服务器名称
        version: "-", // 服务器版本
        state: server.state,
        url,
        delay: "-",
        delays: [], // 记录延迟的曲线
        _server: server,
      });

      const updateInfo = () => {
        item.name = server.serverName; // 服务器名称
        item.version = server.serverVersion; // 服务器版本
        item.delay = server.delay;
        item.state = server.state;
      };

      server.bind("server-info", updateInfo);
      server.bind("change-state", updateInfo);
      server.bind("check-delay", () => {
        updateInfo();
        item.delays.unshift({
          time: Date.now(),
          delay: server.delay,
        });

        // 超过60条记录，删除最旧的一条
        if (item.delays.length > 60) {
          item.delays.pop();
        }
      });

      this.#xdata.push(item);
    });

    this.#data.watchTick(() => {
      // TODO: 握手服务器列表有更新，同步更新xdata
      debugger;
    });

    return this.#xdata;
  }

  // 重置所有服务器
  async reset() {
    this.#data.splice(0, this.#data.length); // 先清空

    if (location.host === "localhost:5559") {
      // 如果没有，则添加默认的服务器
      this.#data.push({
        url: "ws://localhost:18290",
      });
      this.#data.push({
        url: "ws://localhost:18291",
      });
    } else {
      // 添加在线版服务器
      this.#data.push(
        {
          url: "wss://hand-us1.noneos.com",
        },
        {
          url: "wss://hand-jp1.noneos.com",
        }
      );
    }
  }
}
