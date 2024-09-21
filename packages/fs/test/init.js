let _resolve;
export const finalGet = new Promise((resolve) => {
  _resolve = resolve;
});

export const initGet = (get) => {
  _resolve(get);
};
