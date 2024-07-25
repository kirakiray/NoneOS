export const cn = {
  pathEmpty: "文件路径不能为空",
  indexErr: "在数据库{dbname}的{storename}表中没有找到索引{key}",
  setDataErr: "设置数据出错",
  findDataErr: "查找数据出错",
  getDataErr: "获取数据出错",
  rootEmpty: "不允许使用 '/' 开头的路径",
  rootNotExist: "根目录 {rootname} 不存在",
  pathNotFound: "未找到文件夹:{path}",
  storeNotExistMethod: "store中不存在方法 {method}",
  invalidCreateType: "create必须等于'file'或'dir'",
  notDeleteRoot: "不能直接删除根节点{name}",
  deleted: "当前handle已被删除，不能使用{name}；旧地址为:{path}",
  exitedName: "操作失败，{name}已经存在",
  tolowcase: "文件系统对大小写不敏感，{oldName}将会被转为{newName}",
  writefile: "写入文件内容失败:{path}",
  noPicker: "当前浏览器不支持文件选择",
  targetAnotherType:
    "{path} 已经是一个'{exitedType}'，不能创建为'{targetType}'",
  notMoveToChild: "{targetPath} 是 {path} 的子目录，不能移动到自己的子目录",
};

/**
 * 根据键、选项和错误对象生成错误对象。
 *
 * @param {string} key - 错误描述的键。
 * @param {Object} [options] - 映射相关值的选项对象。
 * @param {Error} [error] - 原始错误对象。
 * @returns {Error} 生成的错误对象。
 */
export const getErr = (key, options, error) => {
  let desc = cn[key];

  // 映射相关值
  if (options) {
    for (let k in options) {
      desc = desc.replace(new RegExp(`{${k}}`, "g"), options[k]);
    }
  }

  let errObj;
  if (error) {
    errObj = new Error(desc, { cause: error });
  } else {
    errObj = new Error(desc);
  }
  errObj.code = key;

  return errObj;
};

/**
 * 根据键、选项生成错误描述
 *
 * @param {string} key - 错误描述的键。
 * @param {Object} [options] - 映射相关值的选项对象。
 * @returns {string} 生成的错误描述。
 */
export const getDesc = (key, options) => {
  let desc = cn[key];

  // 映射相关值
  if (options) {
    for (let k in options) {
      desc = desc.replace(new RegExp(`{${k}}`, "g"), options[k]);
    }
  }

  return desc;
};
