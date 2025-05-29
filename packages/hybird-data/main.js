import { HybirdData } from "./hybird-data.js";

export const createData = async (handle) => {
  const data = new HybirdData(
    {},
    {
      handle,
    }
  );

  await data.ready(); 

  return data;
};
