export const SELFHANDLE = Symbol("selfHandle");
export const DATAID = Symbol("dataId");
export const reservedKeys = ["dataStatus", "_id"];
export const Identification = "__dataid__";

export const getRandomId = () => Math.random().toString(36).slice(2);
