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

let __start_resolve;
let currentDirName = new Promise((resolve) => (__start_resolve = resolve));
let currentUserId = "self"; // 当前项目用户id

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
      });
    } catch (err) {
      continue;
    }
  }

  return arr;
};

export default {
  proto: {
    //     // 获取其他设备
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
          const remote = remotes.find((e) => e.userId === userId);

          const { handle } = remote;

          return (exitedProject[exitedName] = this.createProject({
            dirName,
            rootHandle: handle,
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

    async getCurrentProject() {
      // 获取当前项目
      return this.getProject(await currentDirName, currentUserId);
    },

    async changeCurrentProject(dirName, userId = "self") {
      const targetProject = await this.getProject(dirName, userId);

      currentDirName = Promise.resolve(dirName);

      // 只在打开本地项目时，记录上一次的记录
      if (userId === "self") {
        // 记录打开的项目地址
        const rootHandle = await this.dedicatedHandle();

        let beforeOpenedProjectFile = await rootHandle.get("_before_open", {
          create: "file",
        });

        let data = {};

        try {
          data = JSON.parse(await beforeOpenedProjectFile.text());
        } catch (err) {
          data = {};
        }
        data.dirName = dirName;

        await beforeOpenedProjectFile.write(JSON.stringify(data));
      }

      // 刷新所有页面的数据
      this.$("o-page").reloadProject();

      currentUserId = userId;

      return targetProject;
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
    async createProject({ projectName, dirName, rootHandle: root }) {
      // 项目目录名
      dirName =
        dirName || `luminote-project-${Math.random().toString(32).slice(2)}`;

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
        handle: projectHandle,
        projectName: articleData.projectName,
        dirName,
      };

      return redata;
    },

    // 释放所有已加载项目的内存资源
    async revokeAllProject() {
      Object.values(exitedProject).forEach(async (e) => {
        const item = await e;
        item.data.disconnect();
      });
    },
  },
  ready() {
    (async () => {
      // 加载初始化项目
      const rootHandle = await this.dedicatedHandle();

      let beforeOpenedProjectFile = await rootHandle.get("_before_open", {
        create: "file",
      });

      const text = await beforeOpenedProjectFile.text();

      let beforeDirName = "start";

      if (text) {
        try {
          const data = JSON.parse(text);
          if (data.dirName) {
            beforeDirName = data.dirName;
          }
        } catch (err) {}
      }

      __start_resolve(beforeDirName);
    })();
  },
};

// import { setSpace } from "/packages/i18n/data.js";

// await setSpace(
//   "bookmarks",
//   new URL("/packages/apps/bookmarks.napp/lang", location.href).href
// );
