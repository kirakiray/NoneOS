// 按照块的模式，复制文件
export const copyTo = async (options) => {
  const { from: fHandle, to: tHandle } = options;

  let flats;

  // 如果是目录，获取所有文件
  if (fHandle.kind === "dir") {
    flats = await fHandle._getHashs();
  } else {
    flats = [[fHandle.path, await fHandle._getHashs()]];
  }

  debugger;
};
