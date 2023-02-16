import FakeFS from "./base.mjs";

const fs = new FakeFS("default_fs");

console.log("fs => ", fs);

export default fs;
