export const transArticle = async (articleData) => {
  const articles = await transArticleList(articleData.main);
  return articles;
};

/**
 * 递归转换文章列表数据
 * @param {Array} articleListData - 文章列表数据
 * @param {string} lang - 语言标识
 * @returns {Array} 转换后的文章数据数组
 */
const transArticleList = async (articleListData, lang) => {
  const articlePool = [];

  // 遍历文章列表数据
  for (const articleItem of Object.values(articleListData)) {
    if (articleItem.type === "article") {
      const articleData = {
        aid: articleItem.aid,
        title: articleItem.title,
        html: "",
      };

      let isEnd = false;
      let nexts = [];

      // 处理文章内容组件
      for (const component of Object.values(articleItem.content)) {
        // 递归处理嵌套文章
        if (component.type === "article") {
          const subArticlePool = await transArticleList([component], lang);
          articlePool.push(...subArticlePool);
          continue;
        }

        // 处理下一章链接
        if (isEnd && component.type === "lumi-list-item") {
          // 判断是否为链接，如果是则提取内容
          const tempElement = $(`<div>${component.value}</div>`);
          const targetElement = tempElement.$("[selected-article-id]");

          if (targetElement) {
            const aid = targetElement.attr("selected-article-id");
            nexts.push({
              title: tempElement.text,
              aid,
            });
          }
          continue;
        }

        // 标记内容结束，开始获取下一章内容
        if (component.type === "h4" && component.value === "next") {
          isEnd = true;
          continue;
        }

        // 构建HTML内容
        let content = "";
        if (component.type === "paragraph") {
          content = `<p>${component.value}</p>\n`;
        } else {
          content = `<${component.type}>${component.value}</${component.type}>\n`;
        }

        articleData.html += content;
      }

      // 将处理后的文章数据添加到结果池中
      articlePool.push({
        ...articleData,
        nexts,
      });
    }
  }

  return articlePool;
};
