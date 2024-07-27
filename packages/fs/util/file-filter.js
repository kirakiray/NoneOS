export default async function fileFilter(files) {
  const reFiles = Array.from(files).filter((e) => {
    const { webkitRelativePath } = e;
    const paths = webkitRelativePath.split("/");

    return !paths.some((e) => {
      return e === "node_modules" || /^\./.test(e);
    });
  });

  return reFiles;
}
