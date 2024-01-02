import FakeFS from "./src/FakeFS.mjs";

const fs = new FakeFS("default_fs");

fs.create = (name) => {
  return new FakeFS(name);
};

export default fs;
