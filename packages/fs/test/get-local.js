import { get } from "../main.js";
import { ok } from "../../test-util/ok.js";

const localRoot = await get("local");

ok(localRoot.name === "local", "get local");
