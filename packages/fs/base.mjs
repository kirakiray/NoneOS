const getRandomId = (() => {
  if (globalThis.crypto && crypto.randomUUID) {
    return crypto.randomUUID.bind(crypto);
  }
  return () =>
    Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((e) => e.toString(16))
      .join("");
})();

const getParentAndFileName = (path) => {
  const parentPath = path.replace(/(.*\/).+/, "$1");
  const name = path.split("/").pop();

  return { parentPath, name };
};

export default class FakeFS {
  constructor(name) {
    // Replace with private later
    this._fileDB = null;
    this._dbname = name;

    this._initRoot();
  }

  async _initRoot() {
    const rootInfo = await this._readDB("/");

    if (!rootInfo) {
      await this._writeDB([
        {
          data: {
            fid: "/",
            type: "folder",
            // files: new Map(),
            // dirs: new Map()
          },
        },
      ]);
    }
  }

  get _DB() {
    if (this._fileDB) {
      return this._fileDB;
    }

    const fileDB = (this._fileDB = new Promise((resolve, reject) => {
      const req = indexedDB.open(this._dbname);

      req.onsuccess = (e) => {
        // Get the database
        let db = e.target.result;

        db.onclose = () => {
          fileDB = null;
        };

        resolve(db);
      };

      req.onupgradeneeded = (e) => {
        let db = e.target.result;

        // Create an object repository for this database
        if (!db.objectStoreNames.contains("sources")) {
          db.createObjectStore("sources", { keyPath: "fid" });
        }
      };

      req.onerror = (event) => {
        const errDesc = `Failed to initialize database`;
        console.error(errDesc, event);
        reject(errDesc);
      };
    }));

    return fileDB;
  }

  async _writeDB(queue) {
    const db = await this._DB;

    return new Promise((resolve, reject) => {
      const transicator = db.transaction("sources", "readwrite");

      transicator.oncomplete = () => {
        resolve(true);
      };

      transicator.onerror = (err) => {
        reject(err);
      };

      const objectStore = transicator.objectStore("sources");

      queue.forEach((e) => {
        let { operation, data } = e;
        if (operation !== "delete") {
          data = {
            time: Date.now(),
            ...data,
          };
        }
        objectStore[operation || "put"](data);
      });
    });
  }

  async _readDB(fid) {
    const db = await this._DB;

    return new Promise((resolve, reject) => {
      const req = db
        .transaction("sources", "readonly")
        .objectStore("sources")
        .get(fid);

      req.onsuccess = (e) => {
        resolve(e.target.result);
      };
      req.onerror = (err) => {
        reject(err);
      };
    });
  }

  async writeFile(path, data, options = {}) {
    const { parentPath, name } = getParentAndFileName(path);

    const parentFolder = await this._readDB(parentPath);

    if (!parentFolder) {
      throw `Directory does not exist : ${parentPath}`;
    }

    const files = parentFolder.files || (parentFolder.files = new Map());

    // To delete old file data if it already exists
    const oldFile = files.get(name);

    const file = {
      fid: (oldFile && oldFile.fid) || `file-${getRandomId()}`,
      name,
      type: options.type || "file",
    };

    files.set(name, { ...file });

    file.data = data;

    await this._writeDB([{ data: parentFolder }, { data: file }]);

    return file;
  }

  async mkdir(path) {
    const { parentPath, name } = getParentAndFileName(path);

    const parentFolder = await this._readDB(parentPath);

    if (!parentFolder) {
      throw `Directory does not exist => ${parentPath}`;
    }

    const folders = parentFolder.folders || (parentFolder.folders = new Map());

    const oldFolder = folders.get(name);

    if (oldFolder) {
      throw `This folder already exists : ${path}`;
    }

    const folder = {
      fid: path,
      name,
      type: "folder",
    };

    folders.set(name, {
      name,
    });

    await this._writeDB([{ data: parentFolder }, { data: folder }]);

    return folder;
  }

  async readFile(path) {}

  async readDir(path) {}

  async remove(path) {}

  async rename(formPath, toPath) {}

  async copy(formPath, toPath) {}
}
