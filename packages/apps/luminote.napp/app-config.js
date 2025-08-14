import { createArticleData } from "./util/create-article-data.js";


export const home = "./pages/home.html";

export const pageAnime = {
  current: {
    opacity: 1,
    transform: "translate(0, 0)",
  },
  next: {
    opacity: 0,
    transform: "translate(30px, 0)",
  },
  previous: {
    opacity: 0,
    transform: "translate(-30px, 0)",
  },
};

export const allowForward = true;

import { createData, loadData } from "/packages/hybird-data/main.js";

const exitedProject = {};

// 加载项目数据
const loadProjectData = async (rootHandle) => {
  const arr = [];

  for await (let [dirName, item] of rootHandle.entries()) {
    if (item.kind === "file") {
      continue;
    }

    const articleDirHandle = await item.get("article");

    try {
      // 获取项目数据
      const data = await loadData({
        level: 1,
        handle: articleDirHandle,
      });

      arr.push({
        projectName: data.projectName,
        creationtime: data.creationtime,
        dirName,
        projectDataId: data.main._dataId,
        mainLang: data.mainLang,
        __handle: item,
      });
    } catch (err) {
      continue;
    }
  }

  return arr;
};

export default {
  proto: {
    // 获取其他设备
    async getRemotes() {
      const remotes = await this.dedicatedRemoteHandle();

      const arr = [];

      for (let item of remotes) {
        if (!item.hasData) {
          // 没有该应用数据
          arr.push({
            userName: item.userName,
            userId: item.userId,
            _handle: item.handle,
            noData: 1,
            projects: [],
          });
          continue;
        }
        arr.push({
          userName: item.userName,
          userId: item.userId,
          _handle: item.handle,
          projects: (await loadProjectData(item.handle)).map((e) => {
            return { ...e, userId: item.userId };
          }),
        });
      }

      return arr;
    },
    // 获取已经存在的项目名
    async getExistProjects() {
      // 获取专属文件句柄
      const rootHandle = await this.dedicatedHandle();

      return await loadProjectData(rootHandle);
    },
    // 获取项目
    getProject(dirName, userId = "self") {
      if (!dirName) {
        return new Error(`不存在该项目: ${dirName}`);
      }

      const exitedName = dirName + "---" + userId;

      if (exitedProject[exitedName]) {
        return exitedProject[exitedName];
      }

      return (exitedProject[exitedName] = (async () => {
        if (userId !== "self") {
          // 打开远端的用户
          const remotes = await this.dedicatedRemoteHandle();
          console.log("remotes: ", remotes);
          const remote = remotes.find((e) => e.userId === userId);

          if (!remote) {
            exitedProject[exitedName] = null;
            throw new Error(`不存在该用户: ${userId}`);
          }

          const { handle } = remote;

          return (exitedProject[exitedName] = this.createProject({
            dirName,
            rootHandle: handle,
            userId,
          }));
        }

        // 获取专属文件句柄
        const rootHandle = await this.dedicatedHandle();

        // 如果不是初始化文件夹，尝试读取项目目录
        if (dirName !== "start") {
          // 获取目标项目目录handle
          const projectHandle = await rootHandle.get(dirName);

          if (!projectHandle) {
            exitedProject[exitedName] = null;
            return new Error(`不存在项目文件夹 "${dirName}"`);
          }
        }

        return (exitedProject[exitedName] = this.createProject({
          dirName,
          rootHandle,
        }));
      })());
    },

    // 删除本地项目
    async deleteProject(dirName) {
      const exitedName = dirName + "---self";

      // 清除绑定
      if (exitedProject[exitedName]) {
        const projectItem = await exitedProject[exitedName];
        await projectItem.data.disconnect();
        delete exitedProject[exitedName];
      }

      // 删除目录
      const rootHandle = await this.dedicatedHandle();
      const targetHandle = await rootHandle.get(dirName);

      await targetHandle.remove();
    },

    // 创建一个本地项目
    async createProject({ projectName, dirName, userId, rootHandle: root }) {
      // 项目目录名
      dirName = dirName || `luminote-${Math.random().toString(32).slice(2)}`;

      // 获取专属文件句柄
      const rootHandle = root || (await this.dedicatedHandle());

      // 获取目标项目目录handle
      const projectHandle = await rootHandle.get(dirName, {
        create: "dir",
      });

      // 获取文章专属目录
      const articleHandle = await projectHandle.get("article", {
        create: "dir",
      });

      // 生成 article 数据
      const articleData = await createData(articleHandle, {
        saveDebounce: 500, // 数据变动后，500毫秒保存一次
      });

      await articleData.ready(true); // 准备完成

      if (!articleData.main) {
        articleData.projectName = projectName
          ? projectName
          : "Project " + new Date().toLocaleString().replace(/[\/ :]/g, "-");
        articleData.creationtime = Date.now();

        // main 为主体的文章数据
        articleData.main = [createArticleData({ title: "示范页面" })];

        await articleData.ready(true);

        // 等待保存数据
        await new Promise((res) => setTimeout(res, 600));
      }

      const redata = {
        data: articleData,
        __handle: projectHandle,
        userId: userId || "self",
        // handle: projectHandle,
        // projectName: articleData.projectName, // 使用 data.projectName
        // dirName, // 使用 __handle.name
      };

      return redata;
    },

    // 释放所有已加载项目的内存资源
    async revokeAllProject() {
      Object.entries(exitedProject).forEach(async ([key, e]) => {
        const item = await e;
        await item.data.disconnect();
        delete exitedProject[key];
      });

      const configData = await this._configData;
      configData.disconnect();
    },
    // 增加一个项目
    async pushProject(
      dirName,
      userId = "self",
      opts = {
        isSave: true,
      }
    ) {
      const project = await this.getProject(dirName, userId);

      if (project instanceof Error) {
        return;
      }

      // 已经存在则不操作
      if (
        this._openedProjects.find(
          (e) => e.__handle.name === dirName && e.userId === userId
        )
      ) {
        return project;
      }

      this._openedProjects.push({
        ...project,
      });

      if (opts.isSave) {
        saveOpenHistory(this);
      }

      return project;
    },
    // 切换到只剩一个项目上
    async switchProject(dirName, userId = "self") {
      const others = this._openedProjects.filter(
        (e) => e.__handle.name !== dirName || e.userId !== userId
      );

      // 清除数据
      others.forEach((e) => {
        const index = this._openedProjects.indexOf(e);
        this._openedProjects.splice(index, 1);
        exitedProject[e.__handle.name + "---" + e.userId] = null;
        setTimeout(() => {
          // 过快回收会导致渲染的组件提前报错
          e.data.disconnect();
        }, 1000);
      });

      // 打开目标项目
      await this.pushProject(dirName, userId);
    },
    // 关闭项目
    async closeProject(dirName, userId = "self") {
      const targetIndex = this._openedProjects.findIndex(
        (e) => e.__handle.name === dirName
      );

      if (targetIndex !== -1) {
        const targetProject = this._openedProjects.splice(targetIndex, 1)[0];

        setTimeout(() => {
          targetProject.data.disconnect();
        }, 100);

        exitedProject[dirName + "---" + userId] = null;
      }

      saveOpenHistory(this);
    },
  },
  ready() {
    this._openedProjects = $.stanz([]); // 已经打开的项目

    this._configData = (async () => {
      // 获取配置对象
      const rootHandle = await this.dedicatedHandle();
      const configHandle = await rootHandle.get("config.json", {
        create: "file",
      });
      const configData = await createData(configHandle);

      return configData;
    })();

    (async () => {
      // 首先打开start项目
      const his = await getOpenHistory(this);

      for (let e of his) {
        await this.pushProject(e.dirName, e.userId, {
          isSave: false,
        });
      }
    })();
  },
};

const getOpenHistory = async (app) => {
  // 加载初始化项目
  const configData = await app._configData;

  let data = [
    {
      dirName: "start",
      userId: "self",
    },
  ];

  if (configData.lastOpen) {
    data = configData.lastOpen.toJSON();
  }

  return data;
};

// 保存打开的记录
const saveOpenHistory = async (app) => {
  const configData = await app._configData;

  configData.lastOpen = app._openedProjects.map((e) => {
    return {
      dirName: e.__handle.name,
      userId: e.userId,
    };
  });
};
