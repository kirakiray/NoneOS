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

export default {
  ready() {
    this._articleData = (async () => {
      // await new Promise((res) => setTimeout(res, 100));

      // 获取专属文件句柄
      const handle = await this.dedicatedHandle();

      // 获取文章专属目录
      const articleHandle = await handle.get("article", {
        create: "dir",
      });

      const articleData = await createData(articleHandle, {
        saveDebounce: 500,
      });
      await articleData.ready(true); // 准备完成

      if (!articleData.main) {
        // 尝试测试用的文章
        articleData.main = [
          {
            title: "示范页面",
            content: [
              {
                type: "h1",
                value: "基本的文本编辑功能：加粗、斜体、下划线和插入图片",
              },
              {
                type: "paragraph",
                value:
                  "您可以通过继承 TextEditor 类来扩展这个编辑器的功能，或者直接使用它作为一个简单的富文本编辑器。",
              },
              {
                type: "paragraph",
                value:
                  "如果您需要添加更多功能，比如字体大小、颜色选择、列表等，可以在工具栏中添加相应的按钮，并在 handleToolbarAction 方法中实现相应的功能。",
              },
              {
                type: "paragraph",
                value: "",
              },
            ],
          },
        ];
      }

      console.log("articleData:", articleData);

      return articleData;
    })();
  },
};

// import { setSpace } from "/packages/i18n/data.js";

// await setSpace(
//   "bookmarks",
//   new URL("/packages/apps/bookmarks.napp/lang", location.href).href
// );
