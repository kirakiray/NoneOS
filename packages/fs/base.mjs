import Waiter from "./Waiter.js";
import FileInfo from "./FileInfo.js";

const DIRECTORY = "dir";
const FILE = "file";

export const COMMON = {
  DIRECTORY,
  FILE,
};

const INNERDB = Symbol("inner_db");

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
  let parentPath = path.replace(/(.*)\/.+/, "$1");

  if (!parentPath) {
    parentPath = "/";
  }

  const name = path.split("/").pop();

  return { parentPath, name };
};

const isEmpty = (obj) => {
  if (!obj) {
    return true;
  }

  for (let i in obj) {
    return false;
  }

  return true;
};

export default class FakeFS {
  constructor(name) {
    // Replace with private later
    this._fileDB = null;
    this._dbname = name;

    // Directory being written
    this._writing = new Waiter();
  }

  async _initRoot(innerDB) {
    if (!innerDB) {
      return;
    }

    const rootInfo = await this._readDB("/", {
      [INNERDB]: innerDB,
    });

    if (!rootInfo) {
      await this._writeDB(
        [
          {
            data: {
              fid: "/",
              type: DIRECTORY,
              // files: {},
              // folders: {}
            },
          },
        ],
        { [INNERDB]: innerDB }
      );
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

        this._initRoot(db).finally(() => {
          resolve(db);
        });
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

  async _writeDB(queue, options = {}) {
    const db = options[INNERDB] || (await this._DB);

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

  async _readDB(fid, options = {}) {
    const db = options[INNERDB] || (await this._DB);

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

  async writeFile(path, data) {
    const { parentPath, name } = getParentAndFileName(path);

    if (!name) {
      throw `Must have a file name : ${path}`;
    }

    const { next, waiter } = this._writing.lineup(parentPath);

    try {
      await waiter;

      const parentFolder = await this._readDB(parentPath);

      if (!parentFolder) {
        throw `parent directory not found : ${parentFolder}`;
      }

      const files = parentFolder.files || (parentFolder.files = {});

      // To delete old file data if it already exists
      const oldFile = files[name];

      const file = {
        fid: (oldFile && oldFile.fid) || `file-${getRandomId()}`,
        name,
        type: FILE,
      };

      files[name] = file;

      await this._writeDB([
        { data: parentFolder },
        {
          data: {
            ...file,
            data,
          },
        },
      ]);

      next();

      return file;
    } catch (err) {
      next();
      throw err;
    }
  }

  async mkdir(path) {
    const { parentPath, name } = getParentAndFileName(path);

    if (!name) {
      throw `Must have a directory name : ${path}`;
    }

    const { next, waiter } = this._writing.lineup(parentPath);

    try {
      await waiter;

      const parentFolder = await this._readDB(parentPath);

      if (!parentFolder) {
        throw `parent directory not found : ${parentFolder}`;
      }

      const folders = parentFolder.folders || (parentFolder.folders = {});

      const oldFolder = folders[name];

      if (oldFolder) {
        throw `This folder already exists : ${path}`;
      }

      const folder = {
        fid: path,
        name,
        type: DIRECTORY,
      };

      folders[name] = {
        type: DIRECTORY,
        name,
      };

      await this._writeDB([{ data: parentFolder }, { data: folder }]);

      next();

      return folder;
    } catch (err) {
      next();
      throw err;
    }
  }

  async readFile(path) {
    const { parentPath, name } = getParentAndFileName(path);

    await this._writing.getWaiter(parentPath);

    const parentFolder = await this._readDB(parentPath);

    if (!parentFolder) {
      throw `parent directory not found : ${parentFolder}`;
    }

    const targetCache = parentFolder.files[name];

    if (!targetCache) {
      throw `No target file found : ${path}`;
    }

    const { fid } = targetCache;

    const file = await this._readDB(fid);

    if (!file) {
      throw `The target file is corrupted : ${path}`;
    }

    return file.data;
  }

  async readDir(path) {
    const d = await this._readDB(path);

    if (!d) {
      throw `Directory does not exist : ${path}`;
    }

    let folders = [];

    if (d.folders) {
      folders = Object.values(d.folders).map((e) => new FileInfo(e, path));
    }

    let files = [];

    if (d.files) {
      files = Object.values(d.files).map((e) => new FileInfo(e, path));
    }

    return [...folders, ...files];
  }

  async removeFile(path) {
    const { parentPath, name } = getParentAndFileName(path);

    const { next, waiter } = this._writing.lineup(parentPath);

    try {
      await waiter;

      const parentFolder = await this._readDB(parentPath);

      if (!parentFolder) {
        throw `parent directory not found : ${parentFolder}`;
      }

      const { files = {} } = parentFolder;

      const targetFile = files[name];

      if (targetFile) {
        delete files[name];

        await this._writeDB([
          { data: parentFolder },
          {
            operation: "delete",
            data: targetFile.fid,
          },
        ]);

        next();
        return true;
      }

      throw `The file to be deleted does not exist : ${path}`;
    } catch (err) {
      next();
      throw err;
    }
  }

  async removeDir(
    path,
    options = {
      // recursive: false,
    }
  ) {
    const { parentPath, name } = getParentAndFileName(path);

    const { next, waiter } = this._writing.lineup(parentPath);

    try {
      await waiter;

      const parentFolder = await this._readDB(parentPath);

      if (!parentFolder) {
        throw `parent directory not found : ${parentFolder}`;
      }

      const deleteTask = [];

      const originFolder = await this._readDB(path);

      const { files: oriFiles, folders: oriFolders } = originFolder;
      const hasOriFiles = !isEmpty(oriFiles);
      const hasOriFolders = !isEmpty(oriFolders);

      if (!options.recursive && (hasOriFiles || hasOriFolders)) {
        throw `${path} is not an empty directory, you need to set the recursive of removeDir to true`;
      }

      if (hasOriFiles) {
        Object.values(oriFiles).forEach((e) => {
          deleteTask.push({
            operation: "delete",
            data: e.fid,
          });
        });
      }

      if (hasOriFolders) {
        await Promise.all(
          Object.values(oriFolders).map(async (e) => {
            await this.removeDir(`${path}/${e.name}`, { recursive: 1 });
          })
        );
      }

      const { folders = {} } = parentFolder;

      const targetFolder = folders[name];

      if (targetFolder) {
        delete folders[name];

        await this._writeDB([
          { data: parentFolder },
          {
            operation: "delete",
            data: path,
          },
          ...deleteTask,
        ]);

        next();
        return true;
      }

      next();
      return false;
    } catch (err) {
      next();
      throw err;
    }
  }

  async renameFile(fromPath, toPath) {
    const { parentPath: fromParentPath, name: fromName } =
      getParentAndFileName(fromPath);

    const { parentPath: toParentPath, name: toName } =
      getParentAndFileName(toPath);

    const fromParentFolder = await this._readDB(fromParentPath);

    const files_f = fromParentFolder.files || (fromParentFolder.files = {});
    const targetFile = files_f[fromName];

    if (!targetFile) {
      throw `Target file does not exist : ${fromPath}`;
    }

    if (fromParentPath === toParentPath) {
      if (files_f[toName]) {
        throw `File already exists : ${toName}`;
      }

      // Delete from old
      targetFile.name = toName;
      delete files_f[fromName];

      files_f[toName] = targetFile;

      const originFile = await this._readDB(targetFile.fid);
      originFile.name = toName;

      await this._writeDB([{ data: fromParentFolder }, { data: originFile }]);

      return true;
    } else {
      // Cut to go elsewhere
      const toParentFolder = await this._readDB(toParentPath);
      const files_t = toParentFolder.files || (toParentFolder.files = {});

      if (files_t[toName]) {
        throw `File already exists : ${toName}`;
      }

      // Delete from old
      targetFile.name = toName;
      delete files_f[fromName];

      files_t[toName] = targetFile;

      const originFile = await this._readDB(targetFile.fid);
      originFile.name = toName;

      await this._writeDB([
        { data: fromParentFolder },
        { data: originFile },
        { data: toParentFolder },
      ]);

      return true;
    }
  }

  async renameDir(fromPath, toPath) {}

  // async copy(fromPath, toPath) {}
}
