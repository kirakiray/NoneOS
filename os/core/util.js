export async function flatFiles(parHandle, parentsName = []) {
  const files = [];
  let isEmpty = true;

  for await (let [name, handle] of parHandle.entries()) {
    isEmpty = false;
    if (handle.kind === "file") {
      files.push({
        kind: "file",
        name,
        handle,
        parentsName,
      });
    } else {
      const subFiles = await flatFiles(handle, [...parentsName, name]);
      files.push(...subFiles);
    }
  }

  if (isEmpty) {
    files.push({
      kind: "dir",
      parentsName,
    });
  }

  return files;
}
