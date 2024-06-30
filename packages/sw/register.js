let swText = await fetch("/sw.js").then((res) => res.text());

// 去除swText中的js备注代码
swText = swText.replace(/(\/\*[\s\S]*?\*\/)|(\/\/[\s\S]*?\n)/g, "");

let registration;

// 根据内容注册sw
if (swText.includes("importScripts")) {
  registration = navigator.serviceWorker.register("/sw.js");
} else if (swText.includes("import ")) {
  registration = navigator.serviceWorker.register("/sw.js", {
    type: "module",
  });
}

try {
  const reg = await registration;

  setTimeout(() => {
    // 定时更新
    reg.update();
  }, 60 * 60 * 1000);
} catch (err) {
  console.error(err);
}

export { registration };
