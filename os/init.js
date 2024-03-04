(() => {
  const load = lm(import.meta);

  const packagesUrl = import.meta.url.replace(/(.+)\/.+/, "$1");

  // 初始化逻辑
  lm.config({
    alias: {
      "@nos": packagesUrl,
    },
  });

  (async () => {
    const { get } = await load("./core/fs/local/main.js");

    const handle = await get("双击查看说明.txt", {
      create: "file",
    });

    handle.write(`NoneOS说明文件（这个文件的内容会被自动初始化）

NoneOS 是一个基于浏览器的虚拟操作系统，专为前端开发人员设计。它允许你开发独立完整的应用，而无需学习复杂的技术栈，如 Node.js、Webpack、NPM、Vue 或 React。

传统的前端开发需要掌握许多知识，包括操作系统相关的 API。但现在，你只需了解 NoneOS 的 API，就能直接开发跨平台的应用。

目前，NoneOS 中有两个示例应用：Finder（用于查看文件）和 Editor（文本编辑器）。你可以在 os/apps 目录下查看这些应用的构成文件。

关于如何使用 NoneOS：

1. 你可以通过访问 /install 进入系统安装地址，将系统安装到本地。安装完成后，你可以在断网的情况下使用这个虚拟操作系统。
2. 你也可以选择不安装，直接使用在线版。但请注意，如果你断开互联网连接，将无法使用在线版（因为目前处于内测阶段，在线版主要用于开发人员调试，以后的版本将需要安装才能使用）。

进入系统后，点击左下角可以看到已经安装的应用。点击添加应用后，可选择NoneOS的应用安装包进行安装。

目前还在内测阶段，开发人员需要自行摸索api。

NoneOS 目前能做什么？

目前，NoneOS 在浏览器中提供了一个完整的虚拟容器，允许你在其中自主开发应用，而无需依赖外部操作系统。这使得你可以构建 Web 应用程序，实现应用自举的过程。
`);
  })();
})();
