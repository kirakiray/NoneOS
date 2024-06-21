export const cn = {
  pathEmpty: "文件路径不能为空",
  indexErr: "在数据库{dbname}的{storename}表中没有找到索引{key}",
};

/**
 * 获取对应key的错误对象
 * @param {String} key 错误的名称
 * @returns {Error}
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
  return errObj;
};
