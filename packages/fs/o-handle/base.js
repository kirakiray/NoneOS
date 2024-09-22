import { getErr } from "../errors.js";
import { OriginDirHandle } from "./dir.js";
import { copyTo, moveTo } from "../public.js";

const roootId = Math.random().toString(32).slice(2);

/**
 * 基础的Handle
 */
export class OriginBaseHandle {
  #systemHandle;
  #rootSystemHandle;
  #path;
  #name;
  #kind;
  constructor(systemHandle, path, rootSystemHandle) {
    this.#systemHandle = systemHandle;
    this.#name = systemHandle.name;
    this.#kind = systemHandle.kind === "file" ? "file" : "dir";
    if (path) {
      this.#path = path;
    } else {
      this.#path = systemHandle.name;
    }

    if (rootSystemHandle) {
      this.#rootSystemHandle = rootSystemHandle;
    } else {
      this.#rootSystemHandle = systemHandle;
    }
  }

  get _fsh() {
    return this.#systemHandle;
  }

  /**
   * 获取当前handle的唯一id
   * @returns {string}
   */
  get id() {
    return `${roootId}-${this.name}`.toLocaleLowerCase();
  }

  /**
   * 获取当前handle的路径
   * @returns {string}
   */
  get path() {
    return this.#path;
  }

  /**
   * 获取文件名
   * @returns {string}
   */
  get name() {
    return this.#name;
  }

  /**
   * 获取当前handle的类型
   * @returns {string}
   */
  get kind() {
    return this.#kind;
  }

  /**
   * 获取根文件夹的handle
   * @returns {Promise<OriginDirHandle>}
   */
  async root() {
    return new OriginDirHandle(this.#rootSystemHandle);
  }

  /**
   * 获取父文件夹handle
   * @returns {Promise<OriginDirHandle>}
   */
  async parent() {
    const paths = this.#path.split("/");

    const root = await this.root();
    if (paths.length === 2) {
      return root;
    }
    if (paths.length > 2) {
      return await root.get(paths.slice(1, -1).join("/"));
    }

    return null;
  }

  /**
   * 移动当前文件或文件夹
   * 若 target 为字符串，则表示重命名
   * @param {(string|OriginDirHandle)} target 移动到目标的文件夹
   * @param {string} name 移动到目标文件夹下的名称
   */
  async moveTo(target, name) {
    const newTarget = await moveTo(this, target, name);

    // 移动过去后，要更新信息
    this.#systemHandle = newTarget.#systemHandle;
    this.#path = newTarget.#path;
    this.#name = newTarget.#name;
    this.#rootSystemHandle = newTarget.#rootSystemHandle;
  }

  /**
   * 复制当前文件或文件夹
   * @param {(string|OriginDirHandle)} target 移动到目标的文件夹
   * @param {string} name 移动到目标文件夹下的名称
   */
  async copyTo(target, name) {
    return copyTo(this, target, name);
  }

  /**
   * 删除当前文件或文件夹
   * @returns {Promise<void>}
   */
  async remove() {
    if (this.#path.split("/").length === 1) {
      // root下属于挂载的目录，不允许直接删除
      throw getErr("notDeleteRoot", {
        name: this.name,
      });
    }

    if (this.#kind === "dir") {
      // 先清空子文件，才能删除自身
      for await (let item of this.values()) {
        await item.remove();
      }
    }

    if (this.#systemHandle.remove) {
      await this.#systemHandle.remove();
    } else {
      // in firefox
      const parent = await this.parent();
      await parent.#systemHandle.removeEntry(this.name);
    }
  }

  async refresh() {
    // Invalid method, compatible with handle
  }

  toJSON() {
    const data = {};
    ["createTime", "id", "kind", "lastModified", "name", "path"].forEach(
      (key) => {
        data[key] = this[key];
      }
    );
    return data;
  }

  get _mark() {
    return "origin";
  }
}
