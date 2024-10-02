import { BaseHandle } from "./base.js";
import { getData, setData, getRandomId } from "./db.js";
import { FileHandle } from "./file.js";
import { getErr } from "../errors.js";
import { getSelfData, updateParentsModified } from "./util.js";

/**
 * 创建文件夹handle
 * @extends {BaseHandle}
 */
export class DirHandle extends BaseHandle {
  /**
   * 创建一个文件句柄实例
   * @param {string} id - 文件句柄的唯一标识符
   */
  constructor(id) {
    super(id, "dir");
  }

  /**
   * 获取子文件或目录的handle
   * @param {string} path - 获取的子文件或目录的路径
   * @param {Object} options - 获取选项的选项
   * @returns  {Promise<(FileHandle|DirHandle)>}
   */
  async get(path, options) {
    await getSelfData(this, "get");

    const paths = path.split("/");

    if (
      options &&
      options.create &&
      options.create !== "file" &&
      options.create !== "dir"
    ) {
      throw getErr("invalidCreateType");
    }

    let self = this;

    if (paths.length > 1) {
      // 如果路径中包含多个路径，则递归获取到最后一个路径的父目录
      // 如果带有 create 参数，则递归创建目录
      for (const memberName of paths.slice(0, -1)) {
        let prevDirHandle = self;
        self = await self.get(memberName, {
          create: options?.create ? "dir" : undefined,
        });
        if (!self) {
          await prevDirHandle.refresh();

          throw getErr("pathNotFound", {
            path: prevDirHandle.path + "/" + memberName,
          });
        }
      }
    }

    // 最后一级子文件或目录名
    let subName = paths.slice(-1)[0];

    let data = await getData({
      index: "parent_and_name",
      key: [self.id, subName.toLowerCase()],
    });

    if (options) {
      if (options.create && !data) {
        const nowTime = Date.now();

        // 当不存在数据，且create有值时，根据值进行创建
        data = {
          createTime: nowTime,
          lastModified: nowTime,
          key: getRandomId(),
          realName: subName,
          name: subName.toLowerCase(),
          parent: self.id,
          type: options.create,
        };

        await setData({
          datas: [data],
        });

        await updateParentsModified(self.id);
      }
    }

    if (options && options.create && options.create !== data.type) {
      // 如果带有 create 参数，且数据类型与 create 参数不一致，抛出错误
      throw getErr("targetAnotherType", {
        path: self.path + "/" + subName,
        exitedType: data.type,
        targetType: options.create,
      });
    }

    return await createHandle(data);
  }

  /**
   * 异步生成器函数，返回子数据的名称。
   * @async
   * @generator
   * @yields {string} 子数据的名称。
   */
  async *keys() {
    getSelfData(this, "keys");

    const datas = await getChildDatas(this.id);

    for (let item of datas) {
      yield item.name;
    }
  }

  /**
   * 异步生成器函数，返回子数据的名称和对应的句柄。
   * @async
   * @generator
   * @yields {Array} 包含子数据名称和句柄的数组。
   */
  async *entries() {
    getSelfData(this, "entries");

    const datas = await getChildDatas(this.id);

    for (let item of datas) {
      yield [item.name, await createHandle(item)];
    }
  }

  /**
   * 异步生成器函数，返回子数据的句柄。
   * @async
   * @generator
   * @yields {(DirHandle|FileHandle)} 子数据的句柄。
   */
  async *values() {
    getSelfData(this, "values");

    for await (let [, handle] of this.entries()) {
      yield handle;
    }
  }

  /**
   * 异步函数，对每个子数据执行回调函数。
   * @async
   * @param {Function} callback - 对每个子数据执行的回调函数，接收句柄和索引作为参数。
   */
  async forEach(callback) {
    getSelfData(this, "forEach");

    const datas = await getChildDatas(this.id);

    let index = 0;
    for (let item of datas) {
      await callback(await createHandle(item), index);
      index++;
    }
  }

  async length() {
    getSelfData(this, "length");

    const data = await getData({
      key: this.id,
      index: "parent",
      method: "count",
    });

    return data;
  }
}

const getChildDatas = async (id) => {
  return await getData({
    key: id,
    index: "parent",
    method: "getAll",
  });
};

const createHandle = async (data) => {
  let result = null;

  if (data) {
    switch (data.type) {
      case "dir":
        result = new DirHandle(data.key);
        break;
      case "file":
        result = new FileHandle(data.key);
        break;
    }

    await result.refresh();
  }

  return result;
};
