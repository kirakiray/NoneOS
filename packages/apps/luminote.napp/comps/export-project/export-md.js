import { getListData } from "./get-list-data.js";
import { exportHandle } from "/packages/fs/task/main.js";

export const proto = {
  async exportFullsite() {
    this.exporting = true;
    const projectInfo = await this.app.getProject(this.projectDirname, "self");
    await this._generateFullsite(projectInfo);

    // 单个fullsite文档文件
    const fullsiteHandle = await projectInfo.__handle.get("web/fullsite.txt");

    const projectName = projectInfo.data.projectName;
    await exportHandle([fullsiteHandle.path], `${projectName}-fullsite.txt`);

    this.exporting = false;
  },
  async _generateFullsite(projectInfo) {
    const projectName = projectInfo.data.projectName;

    // 只获取正文的列表数据
    const listData = await getListData({
      list: projectInfo.data.main,
      lang: projectInfo.data.mainLang,
      mainLang: projectInfo.data.mainLang,
      needContent: true,
    });

    let content = `# ${projectName}\n\n`;

    listData.forEach((e) => {
      const articleContent = getMdContent(e);
      content += articleContent;
    });

    // 单个fullsite文档文件
    const fullsiteHandle = await projectInfo.__handle.get("web/fullsite.txt", {
      create: "file",
    });

    await fullsiteHandle.write(content);
  },
  async exportMd() {},
};

const getMdContent = (articleData) => {
  let content = "";

  for (let item of articleData.content) {
    let lineContent = "";

    if (item.type === "h2") {
      lineContent = `## ${item.value}\n\n`;
    } else if (item.type === "h3") {
      lineContent = `### ${item.value}\n\n`;
    } else if (item.type === "h4") {
      lineContent = `#### ${item.value}\n\n`;
    } else if (item.type === "paragraph") {
      lineContent = `${item.value}\n\n`;
    } else if (item.type === "article") {
      continue;
    } else {
      // 自定义组件
      const el = $(`<${item.type}>${item.value}</${item.type}>`);
      el.style.display = "none";
      $("body").push(el);

      lineContent = el.mdContent + "\n";

      el.remove();
    }

    if (item.tab) {
      lineContent = `${"\t".repeat(item.tab)}${lineContent}`;
    }

    content += lineContent;
  }

  return content;
};
