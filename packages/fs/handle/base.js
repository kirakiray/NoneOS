export const KIND = Symbol("kind");
export const DELETED = Symbol("deleted");
import { getData, setData } from "../db.js";
import { getErr } from "../errors.js";
import { DirHandle } from "./dir.js";
import { clearHashs, judgeDeleted } from "../util.js";

/**
 * 基础的Handle
 */
export class BaseHandle {
  #id;
  #path;
  #name;
  constructor(id) {
    this.#id = id;
  }

  /**
   * 获取当前handle在db中的id
   * @returns {string}
   */
  get id() {
    return this.#id;
  }

  /**
   * 获取当前handle的路径
   * @returns {string}
   */
  get path() {
    judgeDeleted(this, "path");
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
    return this[KIND];
  }

  /**
   * 获取根文件夹的handle
   * @returns {Promise<DirHandle>}
   */
  async root() {
    judgeDeleted(this, "root");
    debugger;
  }

  /**
   * 获取父文件夹handle
   * @returns {Promise<DirHandle>}
   */
  async parent() {
    judgeDeleted(this, "parent");

    const data = await getData({ key: this.#id });

    if (data.parent === "root") {
      return null;
    }

    const parentHandle = new DirHandle(data.parent);
    await parentHandle.refresh();

    return parentHandle;
  }

  /**
   * 移动当前文件或文件夹
   * 若 target 为字符串，则表示重命名
   * @param {(string|DirHandle)} target 移动到目标的文件夹
   * @param {string} name 移动到目标文件夹下的名称
   */
  async move(target, name) {
    judgeDeleted(this, "move");

    if (typeof target === "string") {
      name = target;
      target = await this.parent();
    }

    debugger;
    await this.refresh();
  }

  async copy(path) {
    debugger;
  }

  /**
   * 删除当前文件或文件夹
   * @returns {Promise<void>}
   */
  async remove() {
    judgeDeleted(this, "remove");

    const data = await getData({ key: this.id });

    if (data.parent === "root") {
      // root下属于挂载的目录，不允许直接删除
      throw getErr("notDeleteRoot", {
        name: this.name,
      });
    }

    if (this.kind === "dir") {
      // 删除子文件和文件夹
      await this.forEach(async (handle) => {
        await handle.remove();
      });
    }

    const oldHashs = data.hashs || [];

    const removes = [data.key];
    oldHashs.forEach((e, index) => {
      removes.push(`${data.key}-${index}`);
    });

    this[DELETED] = true;

    await setData({
      removes,
    });

    if (oldHashs.length) {
      await clearHashs(oldHashs);
    }
  }

  /**
   * 刷新当前文件或文件夹的信息（主要更新 path 和 name 的信息）
   * 当 handle 被 move方法执行成功后，需要及时更新信息
   */
  async refresh() {
    judgeDeleted(this, "refresh");

    const data = await getData({ key: this.#id });
    this.#name = data.name;

    // 重新从db中获取parent数据并更新path
    const pathArr = [data.name];

    let currentData = data;
    while (currentData.parent !== "root") {
      currentData = await getData({ key: currentData.parent });
      pathArr.unshift(currentData.name);
    }

    this.#path = pathArr.join("/");
  }
}
