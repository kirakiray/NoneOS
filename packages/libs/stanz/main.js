// 保证使用统一的 Stanz 类
import { Stanz as oriStanz } from "./stanz.mjs";

let exStanz = oriStanz;

if (globalThis.$ && globalThis.$.Stanz) {
  exStanz = globalThis.$.Stanz;
}

export const Stanz = exStanz;
