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
          projects: await loadProjectData(item.handle),
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
    getProject(dirName) {
      if (!dirName) {
        return new Error(`不存在该项目: ${dirName}`);
      }

      if (exitedProject[dirName]) {
        return exitedProject[dirName];
      }

      return (exitedProject[dirName] = (async () => {
        // 获取专属文件句柄
        const rootHandle = await this.dedicatedHandle();

        // 掉过初始化的project项目
        if (dirName !== "start") {
          // 获取目标项目目录handle
          const projectHandle = await rootHandle.get(dirName);

          if (!projectHandle) {
            exitedProject[dirName] = null;
            return new Error(`不存在项目文件夹 "${dirName}"`);
          }
        }

        return (exitedProject[dirName] = this.createProject({
          dirName,
        }));
      })());
    },

    async getCurrentProject() {
      // 获取当前项目
      return this.getProject(await currentDirName);
    },

    async changeCurrentProject(dirName) {
      const targetProject = await this.getProject(dirName);

      currentDirName = Promise.resolve(dirName);

      {
        // 记录打开的项目地址
        const rootHandle = await this.dedicatedHandle();

        let beforeOpenedProject = await rootHandle.get("_before_open", {
          create: "file",
        });

        await beforeOpenedProject.write(dirName);
      }

      // 刷新所有页面的数据
      this.$("o-page").reloadProject();

      return targetProject;
    },

    // 删除项目
    async deleteProject(dirName) {
      // 清除绑定
      if (exitedProject[dirName]) {
        const projectItem = await exitedProject[dirName];
        await projectItem.data.disconnect();
        delete exitedProject[dirName];
      }

      // 删除目录
      const rootHandle = await this.dedicatedHandle();
      const targetHandle = await rootHandle.get(dirName);

      await targetHandle.remove();
    },

    // 创建一个项目
    async createProject({ projectName, dirName }) {
      // 项目目录名
      dirName =
        dirName || `luminote-project-${Math.random().toString(32).slice(2)}`;

      // 获取专属文件句柄
      const rootHandle = await this.dedicatedHandle();

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

      if (!exitedProject[dirName]) {
        exitedProject[dirName] = redata;
      }

      return redata;
    },

    // 释放所有已加载项目的内存资源
    async revokeAllProject() {
      debugger;

      Object.values(exitedProject).forEach(async (e) => {
        const item = await e;
        item.data.disconnect();
      });
    },
  },
  ready() {
    (async () => {
      const rootHandle = await this.dedicatedHandle();

      let beforeOpenedProject = await rootHandle.get("_before_open", {
        create: "file",
      });

      beforeOpenedProject = await beforeOpenedProject.text();

      if (!beforeOpenedProject) {
        // 如果不存在，相当于等于 start
        beforeOpenedProject = "start";
      }

      __start_resolve(beforeOpenedProject);
    })();
  },
};

// import { setSpace } from "/packages/i18n/data.js";

// await setSpace(
//   "bookmarks",
//   new URL("/packages/apps/bookmarks.napp/lang", location.href).href
// );
