export default class FileInfo {
  constructor(data, parentPath) {
    this.name = data.name;
    this.type = data.type;
    this._parentPath = parentPath;
  }

  get path() {
    const { _parentPath } = this;
    return `${_parentPath === "/" ? "" : _parentPath}/${this.name}`;
  }
}
