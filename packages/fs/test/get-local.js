import { get as _get, origin } from "../main.js";
import { ok } from "../../test-util/ok.js";

const url = import.meta.url;
const { hash } = new URL(url);
// origin模式下，调用 o-handle
const isOrigin = hash === "#origin";

const get = isOrigin ? origin.get : _get;

const localRoot = await get("local");

ok(localRoot.name === "local", "get local");
