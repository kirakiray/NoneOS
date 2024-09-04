import get from "./get.js";
import { get as originGet } from "./origin.js";
export { showPicker } from "./origin.js";
export { getRemotes } from "./remote.js";

const origin = {
  get: originGet,
};

export { get, origin };
