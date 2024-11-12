// 按照块的模式，复制文件
export const copyTo = async (options) => {
  const { from: fHandle, to: tHandle } = options;

  // 复制到目的地的文件名
  let finalName = options.name || fHandle.name;

  // 获取扁平化的数据
  const flatFileDatas = await fHandle._info();

  {
    // 修正来源目标的地址
    const fromDirPath = fHandle.path;
    const fixPath = (item) => {
      const afterPath = item[0].replace(`${fromDirPath}/`, "");
      item[0] = afterPath;
    };
    // 修正地址
    flatFileDatas.forEach(fixPath);
  }

  if (fHandle.kind === "file") {
    debugger;
    return;
  }

  // 复制到这个目录
  const targetDirHandle = await tHandle.get(finalName, {
    create: "dir",
  });

  // 确认信息
  if (options.confirm) {
    const result = options.confirm(JSON.parse(JSON.stringify(flatFileDatas)));

    if (!result) {
      return;
    }
  }

  debugger;
};
