import { getListData } from "./get-list-data.js";

export const proto = {
  async exportLlms() {
    this.exporting = true;

    const projectInfo = await this.app.getProject(this.projectDirname, "self");

    const projectName = projectInfo.data.projectName;

    // 只获取正文的列表数据
    const listData = await getListData({
      list: projectInfo.data.main,
      lang: projectInfo.data.mainLang,
      mainLang: projectInfo.data.mainLang,
      needContent: true,
    });

    let content = "";

    listData.forEach((e) => {
      const articleContent = getMdContent(e);
      content += articleContent;

      debugger;
    });

    this.exporting = false;
  },
  async exportMd() {},
};

const getMdContent = (articleData) => {
  let content = "";

  for (let item of articleData.content) {
    if (item.type === "h2") {
      content += `## ${item.value}\n\n`;
    } else if (item.type === "h3") {
      content += `### ${item.value}\n\n`;
    } else if (item.type === "h4") {
      content += `#### ${item.value}\n\n`;
    } else if (item.type === "paragraph") {
      content += `${item.value}\n\n`;
    } else if (item.type === "article") {
      continue;
    } else {
      // 自定义组件
      const el = $(`<${item.type}>${item.value}</${item.type}>`);
      el.style.display = "none";
      $("body").push(el);

      debugger;
    }
  }

  console.log(content);

  return content;
};
