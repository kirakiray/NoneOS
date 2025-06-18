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

import { createData } from "/packages/hybird-data/main.js";

const exitedProject = {};

let currentDirName = "start";

export default {
  proto: {
    // 获取已经存在的项目名
    async getExistProjects() {},

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
          articleData.projectName = "项目-" + dirName;
          articleData.creationtime = Date.now();

          // main 为主体的文章数据
          articleData.main = [
            {
              title: "示范页面",
              creationtime: Date.now(),
              content: [
                {
                  type: "paragraph",
                  value: "这是一个示范页面。",
                },
                {
                  type: "paragraph",
                  value: "",
                },
              ],
            },
          ];

          await articleData.ready(true);
        }

        return {
          data: articleData,
          handle: projectHandle,
        };
      })());
    },

    async getCurrentProject() {
      // 获取当前项目
      return this.getProject(currentDirName);
    },

    async changeCurrentProject(dirName) {
      // 当前项目
      debugger;
    },

    // 删除项目
    async deleteProject(dirName) {
      debugger;
    },

    // 创建一个项目
    async createProject() {
      // 获取专属文件句柄
      const handle = await this.dedicatedHandle();
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
  ready() {},
};

// import { setSpace } from "/packages/i18n/data.js";

// await setSpace(
//   "bookmarks",
//   new URL("/packages/apps/bookmarks.napp/lang", location.href).href
// );
