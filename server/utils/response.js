export const createResponse = (taskId, success, data) => ({
  type: "post-response",
  taskId,
  success,
  data,
});

export const errorResponse = (taskId, message) => 
  createResponse(taskId, 0, { msg: message });

export const successResponse = (taskId, data) =>
  createResponse(taskId, 1, data);