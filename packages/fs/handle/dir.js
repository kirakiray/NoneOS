import { BaseHandle, KIND } from "./base.js";
import { getData, setData, findData, getRandomId } from "../db.js";
import { FileHandle } from "./file.js";
import { getErr } from "../errors.js";

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
    super(id);
    this[KIND] = "dir";
  }

  /**
   * 获取子文件或目录的handle
   * @param {string} path - 获取的子文件或目录的路径
   * @param {Object} options - 获取选项的选项
   * @returns  {Promise<(FileHandle|DirHandle)>}
   */
  async get(path, options) {
    const paths = path.split("/");

    let self = this;

    if (paths.length > 1) {
      // 如果路径中包含多个路径，则递归获取到最后一个路径的父目录
      // 如果带有 create 参数，则递归创建目录
      for (const memberName of paths.slice(0, -1)) {
        let prevDirHandle = self;
        self = await self.get(memberName, { create: options?.create && "dir" });
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
      key: [self.id, subName],
    });

    if (options) {
      if (options.create && !data) {
        // 当不存在数据，且create有值时，根据值进行创建
        data = {
          createTime: Date.now(),
          key: getRandomId(),
          name: subName,
          parent: self.id,
          type: options.create,
        };

        await setData({
          datas: [data],
        });
      }
    }

    return await createHandle(data);
  }

  async forEach(callback) {
    await findData({
      key: this.id,
      index: "parent",
      // async callback(e) {
      //   await callback(await createHandle(e));
      // },
      callback(e) {
        createHandle(e).then(callback);
      },
    });
  }

  // async *entries() {
  //   const datas = await getData({
  //     key: this.id,
  //     index: "parent",
  //     all: true,
  //   });

  //   for (let item of datas) {
  //     yield [item.name, await createHandle(item)];
  //   }
  // }

  // async *keys() {
  //   for await (let [name] of this.entries()) {
  //     yield name;
  //   }
  // }

  // async *values() {
  //   for await (let [, handle] of this.entries()) {
  //     yield handle;
  //   }
  // }
}

// function makeRangeIterator(start = 0, end = 10, step = 1) {
//   let nextIndex = start;
//   let iterationCount = 0;

//   return {
//     [Symbol.iterator]() {
//       return {
//         next() {
//           let result;
//           if (nextIndex < end) {
//             result = { value: nextIndex, done: false };
//             nextIndex += step;
//             iterationCount++;
//             return result;
//           }
//           return { value: Promise.resolve(iterationCount), done: true };
//         },
//       };
//     },
//   };
// }

// for await (let e of makeRangeIterator(1, 10, 2)) {
//   debugger;
// }

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
