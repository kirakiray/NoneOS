import get from "./get.js";
import { get as originGet } from "./origin.js";

const origin = {
  get: originGet,
};

export { get, origin };
