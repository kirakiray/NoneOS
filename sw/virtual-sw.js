// 所有注册的资源对象
const sours = new Map();

const getRandom = () => Math.random().toString(32).slice(2);

// 等待 response 的任务
const responseTasks = {};

// 等待响应的超时时间（毫秒）
const responseTimeout = 10000;

self.addEventListener("message", function (event) {
  const { source, data } = event;

  switch (data?.type) {
    case "REGISTER":
      // 标签页向 sw 注册虚拟接口，返回生成的id接口
      {
        let target = sours.get(source.id);
        if (!target) {
          sours.set(
            source.id,
            (target = {
              source,
              apis: new Set(),
            })
          );
        }

        // 授权访问的虚拟地址
        const vpath = `/v/${data.name + "_" || ""}${getRandom()}`;

        target.apis.add(vpath);

        target.source.postMessage({
          type: "created",
          vpath,
        });
      }
      break;
    case "TAB_CLOSE":
      // 标签关闭，直接清除相应的源
      sours.delete(source.id);
      break;
    case "remove": {
      // 去除注册的虚拟地址
      const { vpath } = data;
      const target = sours.get(source.id);
      target.apis.delete(vpath);
      break;
    }
    case "response":
      // 从标签页响应的数据
      const { taskId, content } = data;
      if (responseTasks[taskId]) {
        responseTasks[taskId](content);
      }
      break;
  }
});

// service worker 内用于返回数据用的函数
export default async ({ pathname, request }) => {
  let targetSource;
  sours.forEach((e) => {
    if (targetSource) {
      return;
    }
    e.apis.forEach((path) => {
      if (targetSource) {
        return;
      }
      const reg = new RegExp("^" + path);
      if (reg.test(pathname)) {
        targetSource = e.source;
      }
    });
  });

  if (!targetSource) {
    return new Response(undefined, {
      status: 404,
    });
  }

  const taskId = getRandom();

  // 传递 request 会报错，所以只传递这几个重要参数
  const req = {};
  ["url", "mode", "method", "redirect"].forEach((key) => {
    req[key] = request[key];
  });

  targetSource.postMessage({
    type: "request",
    request: req,
    taskId,
  });

  let timer;

  const content = await new Promise((resolve) => {
    responseTasks[taskId] = resolve;
    // 超时的话必须返回
    timer = setTimeout(() => {
      resolve();
    }, responseTimeout);
  });

  clearTimeout(timer);

  if (!content) {
    return new Response(undefined, {
      status: 404,
    });
  }

  const { body, ...opts } = content;

  return new Response(body, { status: 200, ...opts });
};
