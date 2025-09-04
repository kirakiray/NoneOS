// 清除没有被使用的source内的文件
export const clearSource = async (app, projectDirName) => {
  const projectInfo = await app.getProject(projectDirName, "self");

  const source = await projectInfo.__handle.get("source");

  if (!source) {
    return true;
  }

  // 遍历获取所有的hashid
  const hashids = [];

  for await (const hashid of source.keys()) {
    hashids.push(hashid);
  }

  const usedHashids = new Set();

  await projectInfo.data.ready(true);

  const checkContent = async (content) => {
    for (let item of content) {
      if (item.type === "article") {
        await checkContent(item.content);
      } else if (item.type.includes("-") && item.attrs) {
        // 自定义组件
        Object.values(item.attrs).forEach((value) => {
          // 判断是否是hashid
          if (typeof value === "string") {
            hashids.forEach((hashid) => {
              if (value.includes(hashid)) {
                usedHashids.add(hashid);
              }
            });
          }
        });
      }
    }
  };

  // 遍历所有自定义组件，看是否有被使用的
  await checkContent(projectInfo.data.main);

  // 计算未被使用的hashid
  const unUsedHashids = hashids.filter((hashid) => !usedHashids.has(hashid));

  // 删除未被使用的文件
  await Promise.all(
    unUsedHashids.map(async (hashid) => {
      const handle = await source.get(hashid);
      await handle.remove();
    })
  );

  return true;
};
