import { getFileHash } from "/packages/util/hash/main.js";

// 保存文件
export const saveFile = async ($ele, file) => {
  const hash = await getFileHash(file);
  const sourceDirHandle = await getSourceHandle($ele);

  const fileHandle = await sourceDirHandle.get(hash, {
    create: "file",
  });

  await fileHandle.write(file);

  return { fileHandle, hash };
};

export const getFileHandle = async ($ele, hash) => {
  const sourceDirHandle = await getSourceHandle($ele);

  return sourceDirHandle.get(hash);
};

// 根据hash获取文件handle
const getSourceHandle = async (_this) => {
  // 使用更具描述性的变量名，减少重复调用 $(e)
  const notePageElement = _this.composedPath().find((e) => {
    const $element = $(e);
    return $element.src && $element.src.includes("note.html");
  });

  const notePage = $(notePageElement);
  const projectItem = await _this.app.getProject(
    notePage.currentDirName,
    notePage.currentUserId
  );

  const sourceHandle = await projectItem.__handle.get("source", {
    create: "dir",
  });

  return sourceHandle;
};
