export class RemoteBaseHandle {
  #root;
  #relates;
  #kind;
  #badge;
  constructor(paths, root, badge, kind) {
    this.#kind = kind;
    this.#root = root || null;
    this.#relates = paths || [];
    this.#badge = badge;
  }

  get kind() {
    return this.#kind;
  }

  get name() {
    return this._name || this.#relates.slice(-1)[0];
  }

  get badge() {
    return this.#badge;
  }

  async parent() {
    if (this.#relates.length === 0) {
      return null;
    }
    if (this.#relates.length === 1) {
      return this.root;
    }

    return this.root.get(this.relativePaths.slice(0, -1).join("/"));
  }

  get path() {
    return this.#relates.join("/");
  }

  get relativePaths() {
    return this.#relates.slice();
  }

  get root() {
    return this.#root || this;
  }

  async remove(options) {
    const par = await this.parent();
    return par.removeEntry(this.name, options);
  }

  async move(...args) {
    debugger;
  }

  convery(name, args) {
    return this.badge({
      func: "handle-" + name,
      paths: this.relativePaths,
      args,
      self: this,
    });
  }
}

export class RemoteDirHandle extends RemoteBaseHandle {
  constructor({ paths, root, badge, _name }) {
    super(paths, root, badge, "directory");
    if (_name) {
      this._name = _name;
    }
  }

  async get(name, options) {
    const result = await this.convery("get", [name, options]);

    if (result.kind === "file") {
      new RemoteFileHandle({
        paths: [...this.relativePaths, name],
        root: this.root,
        badge: this.badge,
      });
    }

    return new RemoteDirHandle({
      paths: [...this.relativePaths, name],
      root: this.root,
      badge: this.badge,
    });
  }

  async *entries() {
    const result = await this.convery("entries", []);

    for (let item of result) {
      if (item.kind === "file") {
        yield [
          item.name,
          new RemoteFileHandle({
            paths: [...this.relativePaths, item.name],
            root: this.root,
            badge: this.badge,
          }),
        ];
      } else {
        yield [
          item.name,
          new RemoteDirHandle({
            paths: [...this.relativePaths, item.name],
            root: this.root,
            badge: this.badge,
          }),
        ];
      }
    }
  }

  async *keys() {
    for await (let [name] of this.entries()) {
      yield name;
    }
  }

  async *values() {
    for await (let [, handle] of this.entries()) {
      yield handle;
    }
  }

  async removeEntry(name, options) {
    return await this.convery("remove-entry", [name, options]);
  }
}

export class RemoteFileHandle extends RemoteBaseHandle {
  constructor({ paths, root, badge, _name }) {
    super(paths, root, badge, "file");
    if (_name) {
      this._name = _name;
    }
  }

  async write(content) {
    return await this.convery("write", [content]);
  }

  async read(options) {
    const defaults = {
      type: "file", // text buffer
    };

    Object.assign(defaults, options);

    return await this.convery("read", [options]);
  }

  file() {
    return this.read({ type: "file" });
  }

  text() {
    return this.read({ type: "text" });
  }

  buffer() {
    return this.read({ type: "buffer" });
  }

  async stat() {
    const file = await this.read({ type: "file" });

    const result = {};

    ["lastModified", "lastModifiedDate", "name", "size", "type"].forEach(
      (k) => (result[k] = file[k])
    );

    return result;
  }
}
