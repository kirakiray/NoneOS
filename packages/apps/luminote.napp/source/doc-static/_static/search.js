// 搜索文本内容
export const search = async (searchText, lang) => {
  const fullData = await fetch(`../_data/search-index-${lang}.json`).then((e) =>
    e.json()
  );

  const results = [];
  const lowerSearchText = searchText.toLowerCase();

  // 高亮匹配的文本
  const highlightMatch = (text, searchTerm) => {
    const index = text.toLowerCase().indexOf(searchTerm.toLowerCase());
    if (index === -1) return text;

    const before = text.substring(0, index);
    const match = text.substring(index, index + searchTerm.length);
    const after = text.substring(index + searchTerm.length);

    // 适当裁剪内容，保留匹配词前后各20个字符
    const start = Math.max(0, before.length - 20);
    const end = Math.min(after.length, 20);

    return (
      (start > 0 ? "..." : "") +
      before.substring(start) +
      `<b style="color:var( --md-sys-color-primary);">${match}</b>` +
      after.substring(0, end) +
      (end < after.length ? "..." : "")
    );
  };

  fullData.forEach((item) => {
    const titleMatch = item.title.toLowerCase().includes(lowerSearchText);
    const matchedContent = [];

    item.content.forEach((contentItem) => {
      if (contentItem.v.toLowerCase().includes(lowerSearchText)) {
        matchedContent.push({
          index: contentItem.i,
          content: contentItem.v,
          url: item.url,
          highlighted: highlightMatch(contentItem.v, searchText),
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
