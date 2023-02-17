import FakeFS from "./base.mjs";

const fs = new FakeFS("default_fs");

window.gfs = fs;

export default fs;
