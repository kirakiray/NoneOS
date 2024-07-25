import { getData, setData } from "../db.js";
import { getErr } from "../errors.js";
import { DirHandle } from "./dir.js";
import { clearHashs, getSelfData, updateParentsModified } from "./util.js";

/**
 * 基础的Handle
 */
export class BaseHandle {
  #id;
  #kind;
  #path;
  #name;
  #createTime;
  #lastModified;
  constructor(id, kind) {
    this.#id = id;
    this.#kind = kind;
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

  get createTime() {
    return this.#createTime;
  }

  get lastModified() {
    return this.#lastModified || null;
  }

  /**
   * 获取根文件夹的handle
   * @returns {Promise<DirHandle>}
   */
  async root() {
    let data = await getSelfData(this, "root");

    while (data.parent !== "root") {
      data = await getData({ key: data.parent });
    }

    const handle = await new DirHandle(data.key);

    await handle.refresh();

    return handle;
  }

  /**
   * 获取父文件夹handle
   * @returns {Promise<DirHandle>}
   */
  async parent() {
    const data = await getSelfData(this, "parent");

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
  async moveTo(target, name) {
    [target, name] = await getTargetAndName({ target, name, self: this });

    const selfData = await getSelfData(this, "move");
    selfData.parent = target.id;
    selfData.name = name;

    await setData({
      datas: [selfData],
    });

    await this.refresh();
  }

  /**
   * 复制当前文件或文件夹
   * @param {(string|DirHandle)} target 移动到目标的文件夹
   * @param {string} name 移动到目标文件夹下的名称
   */
  async copyTo(target, name) {
    [target, name] = await getTargetAndName({ target, name, self: this });

    let reHandle;

    switch (this.kind) {
      case "dir":
        reHandle = await target.get(name, {
          create: "dir",
        });

        for await (let [name, subHandle] of this.entries()) {
          await subHandle.copyTo(reHandle, name);
        }
        break;
      case "file":
        reHandle = await target.get(name, {
          create: "file",
        });

        // 直接存储hashs数据更高效
        const selfData = await getSelfData(this, "move");
        const targetData = await getData({ key: reHandle.id });

        const hashs = (targetData.hashs = selfData.hashs);

        await setData({
          datas: [
            { ...selfData, ...targetData },
            ...hashs.map((hash, index) => {
              return {
                key: `${targetData.key}-${index}`,
                hash,
                type: "block",
              };
            }),
          ],
        });

        break;
    }

    await updateParentsModified(target.id);

    return reHandle;
  }

  /**
   * 删除当前文件或文件夹
   * @returns {Promise<void>}
   */
  async remove() {
    const data = await getSelfData(this, "remove");

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
    const data = await getSelfData(this, "refresh");

    this.#createTime = data.createTime;
    this.#lastModified = data.lastModified;

    this.#name = data.realName || data.name;

    // 重新从db中获取parent数据并更新path
    const pathArr = [data.realName || data.name];

    let currentData = data;
    while (currentData.parent !== "root") {
      currentData = await getData({ key: currentData.parent });
      pathArr.unshift(currentData.realName || currentData.name);
    }

    this.#path = pathArr.join("/");
  }

  async size() {
    const data = await getSelfData(this, "size");

    if (data.type === "file") {
      return data.size;
    }
  }
}

// 修正 target 和 name 的值
export const getTargetAndName = async ({ target, name, self }) => {
  if (typeof target === "string") {
    name = target;
    target = await self.parent();
  }

  if (!name) {
    name = self.name;
  }

  // 查看是否已经有同名的文件或文件夹
  let exited = false;
  for await (let subName of target.keys()) {
    if (name === subName) {
      exited = 1;
      break;
    }
  }

  if (exited) {
    throw getErr("exitedName", {
      name: `${name}(${target.path}/${name})`,
    });
  }

  if (isSubdirectory(target.path, self.path)) {
    throw getErr("notMoveToChild", {
      targetPath: target.path,
      path: self.path,
    });
  }

  return [target, name];
};

function isSubdirectory(child, parent) {
  if (child === parent) {
    return false;
  }
  const parentTokens = parent.split("/").filter((i) => i.length);
  const childTokens = child.split("/").filter((i) => i.length);
  return parentTokens.every((t, i) => childTokens[i] === t);
}
