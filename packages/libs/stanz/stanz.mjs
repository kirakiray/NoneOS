//! stanz - v8.1.33 https://github.com/ofajs/stanz  (c) 2018-2025 YAO
// const error_origin = "http://127.0.0.1:5793/errors";
const error_origin = "https://ofajs.github.io/ofa-errors/errors";

// 存放错误信息的数据对象
const errors = {};

if (globalThis.navigator && navigator.language) {
  let langFirst = navigator.language.toLowerCase().split("-")[0];

  if (langFirst === "zh" && navigator.language.toLowerCase() !== "zh-cn") {
    langFirst = "zhft";
  }

  (async () => {
    if (typeof localStorage !== "undefined") {
      if (localStorage["ofa-errors"]) {
        const targetLangErrors = JSON.parse(localStorage["ofa-errors"]);
        Object.assign(errors, targetLangErrors);
      }

      const errCacheTime = localStorage["ofa-errors-time"];

      if (!errCacheTime || Date.now() > Number(errCacheTime) + 5 * 60 * 1000) {
        const targetLangErrors = await fetch(
          `${error_origin}/${langFirst}.json`
        )
          .then((e) => e.json())
          .catch(() => null);

        if (targetLangErrors) {
          localStorage["ofa-errors"] = JSON.stringify(targetLangErrors);
          localStorage["ofa-errors-time"] = Date.now();
        } else {
          targetLangErrors = await fetch(`${error_origin}/en.json`)
            .then((e) => e.json())
            .catch((error) => {
              console.error(error);
              return null;
            });
        }

        Object.assign(errors, targetLangErrors);
      }
    }
  })();
}

let isSafari = false;
if (globalThis.navigator) {
  isSafari =
    navigator.userAgent.includes("Safari") &&
    !navigator.userAgent.includes("Chrome");
}

/**
 * 根据键、选项和错误对象生成错误对象。
 *
 * @param {string} key - 错误描述的键。
 * @param {Object} [options] - 映射相关值的选项对象。
 * @param {Error} [error] - 原始错误对象。
 * @returns {Error} 生成的错误对象。
 */
const getErr = (key, options, error) => {
  let desc = getErrDesc(key, options);

  let errObj;
  if (error) {
    if (isSafari) {
      desc += `\nCaused by: ${error.toString()}\n`;

      if (error.stack) {
        desc += `  ${error.stack.replace(/\n/g, "\n    ")}`;
      }
    }
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
const getErrDesc = (key, options) => {
  if (!errors[key]) {
    return `Error code: "${key}", please go to https://github.com/ofajs/ofa-errors to view the corresponding error information`;
  }

  let desc = errors[key];

  // 映射相关值
  if (options) {
    for (let k in options) {
      desc = desc.replace(new RegExp(`{${k}}`, "g"), options[k]);
    }
  }

  return desc;
};

const getRandomId = () => Math.random().toString(32).slice(2);

const objectToString = Object.prototype.toString;
const getType = (value) =>
  objectToString
    .call(value)
    .toLowerCase()
    .replace(/(\[object )|(])/g, "");

const isObject = (obj) => {
  const type = getType(obj);
  return type === "array" || type === "object";
};

const isDebug = {
  value: null,
};

if (typeof document !== "undefined") {
  if (document.currentScript) {
    isDebug.value = document.currentScript.attributes.hasOwnProperty("debug");
  } else {
    isDebug.value = true;
  }
}

const TICKERR = "nexttick_thread_limit";

let asyncsCounter = 0;
let afterTimer;
const tickSets = new Set();
function nextTick(callback) {
  clearTimeout(afterTimer);
  afterTimer = setTimeout(() => {
    asyncsCounter = 0;
  });

  if (isDebug.value) {
    Promise.resolve().then(() => {
      asyncsCounter++;
      if (asyncsCounter > 100000) {
        const err = getErr(TICKERR);
        console.warn(err, "lastCall => ", callback);
        throw err;
      }

      callback();
    });
    return;
  }

  const tickId = `t-${getRandomId()}`;
  tickSets.add(tickId);
  Promise.resolve().then(() => {
    asyncsCounter++;
    // console.log("asyncsCounter => ", asyncsCounter);
    if (asyncsCounter > 50000) {
      tickSets.clear();

      const err = getErr(TICKERR);
      console.warn(err, "lastCall => ", callback);
      throw err;
    }
    if (tickSets.has(tickId)) {
      callback();
      tickSets.delete(tickId);
    }
  });
  return tickId;
}

// export const clearTick = (id) => tickSets.delete(id);

function debounce(func, wait = 0) {
  let timeout = null;
  let hisArgs = [];

  return function (...args) {
    hisArgs.push(...args);

    if (wait > 0) {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.call(this, hisArgs);
        hisArgs = [];
        timeout = null;
      }, wait);
    } else {
      if (timeout === null) {
        timeout = 1;
        nextTick(() => {
          timeout = null;
          const args = hisArgs.slice();
          hisArgs = [];
          func.call(this, args);
        });
      }
    }
  };
}

// Enhanced methods for extending objects
const extend = (_this, proto, descriptor = {}) => {
  [
    ...Object.getOwnPropertyNames(proto),
    ...Object.getOwnPropertySymbols(proto),
  ].forEach((k) => {
    const result = Object.getOwnPropertyDescriptor(proto, k);
    const { configurable, enumerable, writable, get, set, value } = result;

    if ("value" in result) {
      if (_this.hasOwnProperty(k)) {
        _this[k] = value;
      } else {
        Object.defineProperty(_this, k, {
          enumerable,
          configurable,
          writable,
          ...descriptor,
          value,
        });
      }
    } else {
      Object.defineProperty(_this, k, {
        enumerable,
        configurable,
        ...descriptor,
        get,
        set,
      });
    }
  });

  return _this;
};

// 检测 Proxy 是否被撤销的函数
function dataRevoked(proxyToCheck) {
  try {
    // 尝试对 Proxy 做一个无害的操作，例如获取原型
    Object.getPrototypeOf(proxyToCheck);
    return false; // 如果没有抛出错误，则 Proxy 没有被撤销
  } catch (error) {
    if (error instanceof TypeError) {
      return true; // 如果抛出了 TypeError，则 Proxy 已经被撤销
    }
    // throw error; // 抛出其他类型的错误
    return false;
  }
}

const { assign, freeze } = Object;

class Watcher {
  constructor(opts) {
    assign(this, opts);
    freeze(this);
  }

  hasModified(k) {
    if (this.type === "array") {
      return this.path.includes(this.currentTarget.get(k));
    }

    const keys = k.split(".");

    if (this.currentTarget === this.target && this.name === keys[0]) {
      return true;
    }

    const modifieds = getModifieds(this, keys);

    const positionIndex = modifieds.indexOf(this.target);
    if (positionIndex > -1) {
      const currentKeys = keys.slice(positionIndex + 1);

      if (!currentKeys.length) {
        // This is listening for changes in the child object itself
        return true;
      }

      return this.name === currentKeys[0];
    }

    // Data belonging to the chain of change
    return this.path.includes(this.currentTarget[k]);
  }

  hasReplaced(k) {
    if (this.type !== "set") {
      return false;
    }

    const keys = k.split(".");

    if (this.target === this.currentTarget && this.name === keys[0]) {
      return true;
    }

    const modifieds = getModifieds(this, keys);

    const positionIndex = modifieds.indexOf(this.target);

    if (positionIndex > -1) {
      const currentKeys = keys.slice(positionIndex + 1);

      return currentKeys[0] === this.name;
    }

    return false;
  }
}

const getModifieds = (_this, keys) => {
  const modifieds = [];

  const cloneKeys = keys.slice();
  let target = _this.currentTarget;
  while (cloneKeys.length) {
    const targetKey = cloneKeys.shift();
    if (target) {
      target = target[targetKey];
    }

    modifieds.push(target);
  }

  return modifieds;
};

class Watchers extends Array {
  constructor(arr) {
    super(...arr);
  }

  hasModified(key) {
    return this.some((e) => e.hasModified(key));
  }

  hasReplaced(key) {
    return this.some((e) => e.hasReplaced(key));
  }
}

const emitUpdate = ({
  type,
  currentTarget,
  target,
  name,
  value,
  oldValue,
  args,
  path = [],
}) => {
  if (path && path.includes(currentTarget)) {
    const err = getErr("circular_data");

    console.warn(err, {
      currentTarget,
      target,
      path,
    });

    return;
  }

  let options = {
    type,
    target,
    name,
    oldValue,
    value,
  };

  if (type === "array") {
    delete options.value;
    options.args = args;
  }

  if (currentTarget._hasWatchs) {
    const watcher = new Watcher({
      currentTarget,
      ...options,
      path: [...path],
    });

    currentTarget[WATCHS].forEach((func) => {
      func(watcher);
    });
  }

  currentTarget._update &&
    currentTarget.owner.forEach((parent) => {
      emitUpdate({
        currentTarget: parent,
        ...options,
        path: [currentTarget, ...path],
      });
    });
};

var watchFn = {
  watch(callback) {
    if (!(callback instanceof Function)) {
      throw getErr("not_func", { name: "watch" });
    }

    const wid = "w-" + getRandomId();

    this[WATCHS].set(wid, callback);

    return wid;
  },

  unwatch(wid) {
    return this[WATCHS].delete(wid);
  },

  watchTick(callback, wait) {
    if (!(callback instanceof Function)) {
      throw getErr("not_func", { name: "watchTick" });
    }

    return this.watch(
      debounce((arr) => {
        if (dataRevoked(this)) {
          // console.warn(`The revoked object cannot use watchTick : `, this);
          return;
        }
        arr = arr.filter((e) => {
          try {
            e.path.forEach((item) => item.xid);
          } catch (err) {
            return false;
          }

          return true;
        });

        callback(new Watchers(arr));
      }, wait || 0)
    );
  },
  // For manual use of emitUpdate
  refresh(opts) {
    const options = {
      ...opts,
      type: "refresh",
      target: this,
      currentTarget: this,
    };
    emitUpdate(options);
  },
  watchUntil(func, outTime = 30000) {
    return new Promise((resolve, reject) => {
      let f;
      let timer;
      const tid = this.watch(
        (f = () => {
          const bool = func();
          if (bool) {
            clearTimeout(timer);
            this.unwatch(tid);
            resolve(this);
          }
        })
      );

      timer = setTimeout(() => {
        this.unwatch(tid);
        const err = getErr("watchuntil_timeout");
        console.warn(err, func, this);
        reject(err);
      }, outTime);

      f();
    });
  },
};

const { defineProperties: defineProperties$1 } = Object;

const setData = ({ target, key, value, receiver, type, succeed }) => {
  const oldValue = receiver[key];

  let data = value;
  if (isxdata(data)) {
    if (oldValue === value) {
      return true;
    }
    data._owner.push(receiver);
  } else if (isObject(value)) {
    const desc = Object.getOwnPropertyDescriptor(target, key);
    if (!desc || desc.hasOwnProperty("value")) {
      data = new (target.__OriginStanz || Stanz)(value, {
        owner: receiver,
      });

      data._owner.push(receiver);
    }
  }

  const isSame = oldValue === value;

  if (!isSame && isxdata(oldValue)) {
    clearOwner(oldValue, receiver);
  }

  const reval = succeed(data);

  !isSame &&
    // __unupdate: Let the system not trigger an upgrade, system self-use attribute
    !target.__unupdate &&
    emitUpdate({
      type: type || "set",
      target: receiver,
      currentTarget: receiver,
      name: key,
      value,
      oldValue,
    });

  return reval;
};

// 当数据被移除时，清除 owner 数据
const clearOwner = (targetData, owner) => {
  if (isxdata(targetData)) {
    const index = targetData._owner.indexOf(owner);
    if (index > -1) {
      targetData._owner.splice(index, 1);
    } else {
      const err = getErr("error_no_owner");
      console.warn(err, {
        owner,
        mismatch: targetData,
      });
      console.error(err);
    }
  }
};

const handler = {
  set(target, key, value, receiver) {
    if (typeof key === "symbol") {
      return Reflect.set(target, key, value, receiver);
    }

    // Set properties with _ prefix directly
    if (/^_/.test(key)) {
      if (!target.hasOwnProperty(key)) {
        defineProperties$1(target, {
          [key]: {
            writable: true,
            configurable: true,
            value,
          },
        });
      } else {
        Reflect.set(target, key, value, receiver);
      }
      return true;
    }

    try {
      return setData({
        target,
        key,
        value,
        receiver,
        succeed(data) {
          return Reflect.set(target, key, data, receiver);
        },
      });
    } catch (error) {
      const err = getErr(
        "failed_to_set_data",
        {
          key,
        },
        error
      );

      console.warn(err, { target, value });

      throw err;
    }
  },
  deleteProperty(target, key) {
    if (/^_/.test(key) || typeof key === "symbol") {
      return Reflect.deleteProperty(target, key);
    }

    return setData({
      target,
      key,
      value: undefined,
      receiver: target[PROXY],
      type: "delete",
      succeed() {
        return Reflect.deleteProperty(target, key);
      },
    });
  },
};

const mutatingMethods = [
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "reverse",
  "sort",
  "fill",
  "copyWithin",
];

const holder = Symbol("placeholder");

function compareArrays(oldArray, newArray) {
  const backupNewArray = Array.from(newArray);
  const backupOldArray = Array.from(oldArray);
  const deletedItems = [];
  const addedItems = new Map();

  const oldLen = oldArray.length;
  for (let i = 0; i < oldLen; i++) {
    const oldItem = oldArray[i];
    const newIndex = backupNewArray.indexOf(oldItem);
    if (newIndex > -1) {
      backupNewArray[newIndex] = holder;
    } else {
      deletedItems.push(oldItem);
    }
  }

  const newLen = newArray.length;
  for (let i = 0; i < newLen; i++) {
    const newItem = newArray[i];
    const oldIndex = backupOldArray.indexOf(newItem);
    if (oldIndex > -1) {
      backupOldArray[oldIndex] = holder;
    } else {
      addedItems.set(i, newItem);
    }
  }

  return { deletedItems, addedItems };
}

const fn = {};

const arrayFn = Array.prototype;

mutatingMethods.forEach((methodName) => {
  if (arrayFn[methodName]) {
    fn[methodName] = function (...args) {
      const backupArr = Array.from(this);

      const reval = arrayFn[methodName].apply(this[SELF], args);

      const { deletedItems, addedItems } = compareArrays(backupArr, this);

      // Refactoring objects as proxy instances
      for (let [key, value] of addedItems) {
        if (isxdata(value)) {
          value._owner.push(this);
        } else if (isObject(value)) {
          this.__unupdate = 1;
          this[key] = value;
          delete this.__unupdate;
        }
      }

      for (let item of deletedItems) {
        clearOwner(item, this);
      }

      emitUpdate({
        type: "array",
        currentTarget: this,
        target: this,
        args,
        name: methodName,
        oldValue: backupArr,
      });

      if (reval === this[SELF]) {
        return this[PROXY];
      }

      return reval;
    };
  }
});

// Object.getOwnPropertyNames(Array.prototype).forEach((methodName) => {
["concat", "filter", "slice", "flatMap", "map"].forEach((methodName) => {
  if (methodName === "constructor" || mutatingMethods.includes(methodName)) {
    return;
  }

  const oldFunc = Array.prototype[methodName];
  if (oldFunc instanceof Function) {
    fn[methodName] = function (...args) {
      return oldFunc.call(Array.from(this), ...args);
    };
  }
});

const { defineProperties, getOwnPropertyDescriptor, entries } = Object;

const SELF = Symbol("self");
const PROXY = Symbol("proxy");
const WATCHS = Symbol("watchs");
const ISXDATA = Symbol("isxdata");

const isxdata = (val) => val && !!val[ISXDATA];

function constructor(data, handler$1 = handler) {
  // const proxySelf = new Proxy(this, handler);
  let { proxy: proxySelf, revoke } = Proxy.revocable(this, handler$1);

  // Determines the properties of the listener bubble
  proxySelf._update = 1;

  let watchs;

  defineProperties(this, {
    xid: { value: data.xid || getRandomId() },
    // Save all parent objects
    _owner: {
      value: [],
    },
    owner: {
      configurable: true,
      get() {
        return new Set(this._owner);
      },
    },
    [ISXDATA]: {
      value: true,
    },
    [SELF]: {
      configurable: true,
      get: () => this,
    },
    [PROXY]: {
      configurable: true,
      get: () => proxySelf,
    },
    // Save the object of the listener function
    [WATCHS]: {
      get: () => watchs || (watchs = new Map()),
    },
    _hasWatchs: {
      get: () => !!watchs,
    },
    _revoke: {
      value: revoke,
    },
  });

  Object.keys(data).forEach((key) => {
    const descObj = getOwnPropertyDescriptor(data, key);
    let { value, get, set } = descObj;

    if (get || set) {
      defineProperties(this, {
        [key]: descObj,
      });
    } else {
      // Set the function directly
      proxySelf[key] = value;
    }
  });

  return proxySelf;
}

class Stanz extends Array {
  constructor(data, options) {
    // options是被继承的类库使用的参数，当前stanz不需要使用
    super();

    return constructor.call(this, data);
  }

  // This method is still in the experimental period
  revoke() {
    const self = this[SELF];

    if (self._onrevokes) {
      self._onrevokes.forEach((f) => f());
      self._onrevokes.length = 0;
    }

    self.__unupdate = 1;

    self[WATCHS].clear();

    entries(this).forEach(([name, value]) => {
      if (isxdata(value)) {
        this[name] = null;
      }
    });

    self._owner.forEach((parent) => {
      entries(parent).forEach(([name, value]) => {
        if (value === this) {
          parent[name] = null;
        }
      });
    });

    delete self[SELF];
    delete self[PROXY];
    self._revoke();
  }

  toJSON() {
    let obj = {};

    let isPureArray = true;
    let maxId = -1;

    Object.keys(this).forEach((k) => {
      let val = this[k];

      if (!/\D/.test(k)) {
        k = parseInt(k);
        if (k > maxId) {
          maxId = k;
        }
      } else {
        isPureArray = false;
      }

      if (isxdata(val)) {
        val = val.toJSON();
      }

      obj[k] = val;
    });

    if (isPureArray) {
      obj.length = maxId + 1;
      obj = Array.from(obj);
    }

    const xid = this.xid;
    defineProperties(obj, {
      xid: {
        get: () => xid,
      },
    });

    return obj;
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }

  extend(obj, desc) {
    return extend(this, obj, desc);
  }

  get(key) {
    if (/\./.test(key)) {
      const keys = key.split(".");
      let target = this;
      for (let i = 0, len = keys.length; i < len; i++) {
        try {
          target = target[keys[i]];
        } catch (error) {
          const err = getErr(
            "failed_to_get_data",
            {
              key: keys.slice(0, i).join("."),
            },
            error
          );

          console.warn(err, {
            key,
            self: this,
          });

          throw err;
        }
      }

      return target;
    }

    return this[key];
  }
  set(key, value) {
    if (/\./.test(key)) {
      const keys = key.split(".");
      const lastKey = keys.pop();
      let target = this;
      for (let i = 0, len = keys.length; i < len; i++) {
        try {
          target = target[keys[i]];
        } catch (error) {
          const err = getErr(
            "failed_to_get_data",
            {
              key: keys.slice(0, i).join("."),
            },
            error
          );

          console.warn(err, {
            key,
            self: this,
          });

          throw err;
        }
      }

      return (target[lastKey] = value);
    }

    return (this[key] = value);
  }
}

Stanz.prototype.extend(
  { ...watchFn, ...fn },
  {
    enumerable: false,
  }
);

const stanz = (data) => {
  return new Stanz(data);
};

Object.assign(stanz, { is: isxdata });

export { Stanz, stanz as default };
