const SName = Symbol("storage-name");
const IDB = Symbol("idb");

export class EverCache {
  constructor(id = "public") {
    // this[SName] = id;
    this[SName] = "main";

    this[IDB] = new Promise((resolve) => {
      let req = indexedDB.open(`ever-cache-${id}`);

      req.onsuccess = (e) => {
        resolve(e.target.result);
      };

      req.onupgradeneeded = (e) => {
        // e.target.result.createObjectStore(id, { keyPath: "key" });
        e.target.result.createObjectStore("main", { keyPath: "key" });
      };
    });

    return new Proxy(this, handle);
  }

  async setItem(key, value) {
    return commonTask(this, (store) => store.put({ key, value })).then(
      () => true
    );
  }

  async getItem(key) {
    try {
      return commonTask(this, (store) => store.get(key), "readonly").then(
        (e) => {
          const { result } = e.target;
          return result ? result.value : null;
        }
      );
    } catch (err) {
      debugger;
    }
  }

  async removeItem(key) {
    return commonTask(this, (store) => store.delete(key)).then(() => true);
  }

  async clear() {
    return commonTask(this, (store) => store.clear()).then(() => true);
  }

  async key(index) {
    return commonTask(this, (store) => store.getAllKeys()).then(
      (e) => e.target.result[index]
    );
  }

  get length() {
    return commonTask(this, (store) => store.count()).then(
      (e) => e.target.result
    );
  }

  entries() {
    return {
      [Symbol.asyncIterator]: () => {
        let resolve;
        let cursorPms;
        const resetPms = () => {
          cursorPms = new Promise((res) => (resolve = res));
        };
        resetPms();

        commonTask(
          this,
          (store) => store.openCursor(),
          "readonly",
          (e) => resolve(e.target.result)
        );

        return {
          async next() {
            const cursor = await cursorPms;
            if (!cursor) {
              return {
                done: true,
              };
            }
            resetPms();
            const { key, value } = cursor.value;
            cursor.continue();

            return { value: [key, value], done: false };
          },
        };
      },
    };
  }

  async *keys() {
    for await (let [key, value] of this.entries()) {
      yield key;
    }
  }

  async *values() {
    for await (let [key, value] of this.entries()) {
      yield value;
    }
  }
}

const exitedKeys = new Set(Object.getOwnPropertyNames(EverCache.prototype));

const handle = {
  get(target, key, receiver) {
    if (exitedKeys.has(key) || typeof key === "symbol") {
      return Reflect.get(target, key, receiver);
    }

    return target.getItem(key);
  },
  set(target, key, value) {
    return target.setItem(key, value);
  },
  deleteProperty(target, key) {
    return target.removeItem(key);
  },
};

const commonTask = async (_this, afterStore, mode = "readwrite", succeed) => {
  const db = await _this[IDB];

  return new Promise((resolve, reject) => {
    const req = afterStore(
      db.transaction([_this[SName]], mode).objectStore(_this[SName])
    );

    req.onsuccess = (e) => {
      if (succeed) {
        const result = succeed(e);
        if (result) {
          resolve(result);
        }

        return;
      }

      resolve(e);
    };
    req.onerror = (e) => {
      reject(e);
    };
  });
};

export const storage = new EverCache();
