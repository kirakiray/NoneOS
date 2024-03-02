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
      case "created": {
        vpath = data.vpath;
        created && created(vpath);
        break;
      }
      case "request": {
        const { request, taskId } = data;

        const content = await callback({ request });

        post({
          type: "response",
          taskId,
          content,
        });
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
