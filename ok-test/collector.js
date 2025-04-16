export const init = async (options) => {
  const {
    cases, // 测试用例数组
    parallel = 1, // 默认并行数为1
    getCountFn, // 获取测试用例数量的函数
    timeout = 5000, // 超时时间，单位毫秒
  } = options;

  for (const path of cases) {
    // 获取测试用例数量
    const count = await getCaseCount(path, getCountFn);

    const targetWindow = open(path);
    // 等待对方发送通知
    await new Promise((resolve) => {
      targetWindow.addEventListener("message", (event) => {
        const { data } = event;
        if (data.type === "test-completed") {
          const casesResult = data.cases;
          const caseTitle = data.title;

          // 收到通知，关闭窗口
          targetWindow.close();

          // 创建结果显示容器
          const resultContainer = document.createElement("div");
          resultContainer.style.margin = "20px";
          resultContainer.style.padding = "15px";
          resultContainer.style.border = "1px solid #ddd";
          resultContainer.style.borderRadius = "5px";

          // 添加标题
          const titleElement = document.createElement("h3");
          titleElement.textContent = `测试套件: ${caseTitle}`;
          resultContainer.appendChild(titleElement);

          // 查看用例数量是否相等
          if (casesResult.length !== count) {
            const countError = document.createElement("div");
            countError.style.color = "red";
            countError.textContent = `错误: 预期 ${count} 个测试用例，实际运行了 ${casesResult.length} 个`;
            resultContainer.appendChild(countError);
          }

          // 添加测试结果列表
          const resultList = document.createElement("ul");

          // 查看用例是否出错
          casesResult.forEach((e) => {
            const itemTitle = e.name;
            const itemStatus = e.status;
            const listItem = document.createElement("li");

            if (itemStatus === "error") {
              listItem.style.color = "red";
              listItem.textContent = `❌ ${itemTitle}: ${
                e.error || "测试失败"
              }`;
            } else {
              listItem.style.color = "green";
              listItem.textContent = `✓ ${itemTitle}`;
            }

            resultList.appendChild(listItem);
          });

          resultContainer.appendChild(resultList);
          document.body.appendChild(resultContainer);

          resolve();
        }
      });
    });
  }
};

const getCaseCount = async (path, getCountFn) => {
  const text = await fetch(path).then((res) => res.text());

  if (getCountFn) {
    return getCountFn(text);
  }

  // 正则匹配  await test("xxx", async () => { 的数量
  const count = (text.match(/await test\(".*", async \(\) => {/g) || []).length;

  return count;
};
