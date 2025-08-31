// 搜索文本内容
export const search = async (searchText, lang) => {
  const fullData = await fetch(`../_data/search-index-${lang}.json`).then((e) =>
    e.json()
  );

  const results = [];
  const lowerSearchText = searchText.toLowerCase();

  fullData.forEach((item) => {
    const titleMatch = item.title.toLowerCase().includes(lowerSearchText);
    const matchedContent = [];

    item.content.forEach((contentItem) => {
      if (contentItem.v.toLowerCase().includes(lowerSearchText)) {
        matchedContent.push({
          index: contentItem.i,
          content: contentItem.v,
        });
      }
    });

    if (titleMatch || matchedContent.length > 0) {
      results.push({
        id: item.id,
        title: item.title,
        url: item.url,
        titleMatch,
        matchedContent,
      });
    }
  });

  return results;
};
