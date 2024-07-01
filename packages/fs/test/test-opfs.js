const opfsRoot = await navigator.storage.getDirectory();

const localRoot = await opfsRoot.getDirectoryHandle("local", {
  create: true,
});

import { OriginDirHandle } from "../op-handle/dir.js";

const rootHandle = new OriginDirHandle(localRoot);

const f1 = await rootHandle.get("a.txt", {
  create: "file",
});

const f1_2 = await rootHandle.get("h1/aa2.txt", {
  create: "file",
});

debugger;
