export default class Waiter {
  constructor() {
    this._pool = {};
  }

  getWaiter(id) {
    let oldPms = this._pool[id];

    if (!oldPms) {
      oldPms = this._pool[id] = Promise.resolve();
    }

    return oldPms;
  }

  lineup(id) {
    let oldPms = this.getWaiter(id);

    let next;
    const innerPms = new Promise((resolve) => {
      next = resolve;
    });

    this._pool[id] = oldPms.then((e) => {
      return innerPms;
    });

    return {
      next,
      waiter: oldPms,
    };
  }
}
