import { unzip } from "/packages/libs/zip/main.js";

export const importProject = async ({ app, file, onError, onProgress }) => {
  const files = await unzip(file);

  // 确保有 article.json 文件
  const articleJsonItem = files.find((e) => e.path === `article.json`);
  if (!articleJsonItem) {
    onError();
    return;
  }

  // 转换项目数据
  let projectData = await articleJsonItem.file.text();
  projectData = JSON.parse(projectData);

  onProgress("ready");

  // 创建一个空白项目
  const projectItem = await app.createProject({
    projectName: projectData.projectName,
  });

  Object.assign(projectItem.data, projectData);

  await new Promise((resolve) => setTimeout(resolve, 200));

  // 等待数据存储完成
  await projectItem.data.ready(true);

  let count = 0;
  for (let { path, file } of files) {
    if (path !== "article.json") {
      const fileHandle = await projectItem.__handle.get(path, {
        create: "file",
      });

      await fileHandle.write(file);
    }

    count++;
    onProgress(count / files.length);
  }

  return projectData;
};
