const Router = require("koa-router");

const connector = new Router();

const users = {};

connector.post("/", async (ctx) => {
  console.log("users => ", users);

  ctx.body = ctx;

  const postData = ctx.request.body;

  console.log("postData =>", postData);
});

module.exports = connector;
