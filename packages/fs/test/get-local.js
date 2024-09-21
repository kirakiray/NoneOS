import { finalGet } from "./init.js";

import { ok } from "./ok.js";

(async () => {
  const get = await finalGet;

  const localRoot = await get("local");

  ok(localRoot.name === "local", "get local");
})();
