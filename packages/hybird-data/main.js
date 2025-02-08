const Stanz = $.Stanz;

export class HybirdData extends Stanz {
  constructor(data) {
    super(data);
    if (data.dataStatus) {
      const err = new Error("dataStatus is a reserved key");
      console.warn(err, data);
      throw err;
    }
    this.dataStatus = true;
  }

  get __Origin() {
    return HybirdData;
  }
}
