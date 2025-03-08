// let swText = await fetch("/sw.js").then((res) => res.text());

// // 去除swText中的js备注代码
// swText = swText.replace(/(\/\*[\s\S]*?\*\/)|(\/\/[\s\S]*?\n)/g, "");

// let options = {};
// // 根据内容注册sw
// if (swText.includes("import ")) {
//   options = {
//     type: "module",
//   };
// }

// const registration = navigator.serviceWorker.register("/sw.js", {
//   type: "module",
// });
const registration = navigator.serviceWorker.register("/sw.js");

setTimeout(async () => {
  try {
    const reg = await registration;

    setTimeout(() => {
      // 定时更新
      reg.update();
    }, 60 * 60 * 1000);
  } catch (err) {
    console.error(err);
  }
}, 100);

export { registration };
