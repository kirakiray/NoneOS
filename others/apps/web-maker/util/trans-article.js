export const transArticle = async (articleData) => {
  const articles = await transArticleList(articleData.main);

  debugger;
  return articles;
};

const transArticleList = async (articleListData, lang) => {
  const pool = [];

  // 计算最大数组
  for (let item of Object.values(articleListData)) {
    if (item.type === "article") {
      const articleData = {
        aid: item.aid,
        html: "",
      };

      articleData.title = item.title;

      let isEnd = false;
      let nexts = [];

      for (let comp of Object.values(item.content)) {
        if (comp.type === "article") {
          const subPool = await transArticleList([comp], lang);

          pool.push(...subPool);
          continue;
        }

        if (isEnd && comp.type === "lumi-list-item") {
          // 判断是否link，是的话截取内容
          const temp = $(`<div>${comp.value}</div>`);
          const target = temp.$("[selected-article-id]");
          if (target) {
            const aid = target.attr("selected-article-id");

            nexts.push({
              title: temp.text,
              aid,
            });
          }
          continue;
        }

        if (comp.type === "h4" && comp.value === "next") {
          // 内容结束，开始获取下一章的内容
          isEnd = true;
          continue;
        }

        let content = "";

        if (comp.type === "paragraph") {
          content = `<p>${comp.value}</p>\n`;
        } else {
          content = `<${comp.type}>${comp.value}</${comp.type}>\n`;
        }

        articleData.html += content;
      }

      pool.push({
        articleData,
        nexts,
      });
    }
  }

  return pool;
};
