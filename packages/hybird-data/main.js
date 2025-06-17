import { HybirdData } from "./hybird-data.js";

export const createData = async (handle, options) => {
  const data = new HybirdData(
    {},
    {
      ...options,
      handle,
    }
  );

  await data.ready();

  return data;
};
