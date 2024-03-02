const post = (data) => {
  navigator.serviceWorker.controller.postMessage(data);
};

export const createApi = ({ callback, name, created }) => {
  let isClose = false;

  let vpath;
  post({
    type: "REGISTER",
    name,
  });

  window.addEventListener("unload", function () {
    post({
      type: "TAB_CLOSE",
    });
  });

  navigator.serviceWorker.addEventListener("message", async (event) => {
    const { data } = event;
    switch (data.type) {
      case "created":
        if (!vpath) {
          vpath = data.vpath;
          created && created(vpath);
        }
        break;

      case "request": {
        const { request, taskId } = data;

        const urlObj = new URL(request.url);

        const reg = new RegExp(`^${vpath}`);

        if (reg.test(urlObj.pathname)) {
          const content = await callback({
            request,
            // 修正后的pathname
            pathname: urlObj.pathname.replace(reg, ""),
            searchParams: urlObj.searchParams,
            search: urlObj.search,
            hash: urlObj.hash,
          });

          post({
            type: "response",
            taskId,
            content,
          });
        }
        break;
      }
    }
  });

  return {
    get path() {
      return vpath;
    },
    close() {
      isClose = true;
      post({
        type: "remove",
        vpath,
      });
    },
  };
};
