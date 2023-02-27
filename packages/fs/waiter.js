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

// const test = new Waiter();

// const { next: n1, waiter: w1 } = test.lineup("1");

// w1.then((e) => {
//   console.log("111");
// });

// const { next: n2, waiter: w2 } = test.lineup("1");

// w2.then((e) => {
//   console.log("222");
// });

// const { next: n3, waiter: w3 } = test.lineup("1");

// w3.then((e) => {
//   console.log("333");
// });

// Object.assign(window, { n1, n2, n3 });
