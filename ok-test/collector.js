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

          targetWindow.close();

          // 创建结果显示容器 - Playwright风格
          const resultContainer = document.createElement("div");
          resultContainer.style.margin = "20px 0";
          resultContainer.style.padding = "0";
          resultContainer.style.border = "1px solid #e5e5e5";
          resultContainer.style.borderRadius = "4px";
          resultContainer.style.overflow = "hidden";
          resultContainer.style.fontFamily =
            "ui-sans-serif, system-ui, sans-serif";

          // 添加标题 - Playwright风格
          const titleElement = document.createElement("div");
          titleElement.style.padding = "12px 16px";
          titleElement.style.backgroundColor = "#f8f8f8";
          titleElement.style.borderBottom = "1px solid #e5e5e5";
          titleElement.style.fontWeight = "600";
          titleElement.textContent = `Test Suite: ${caseTitle}`;
          resultContainer.appendChild(titleElement);

          // 查看用例数量是否相等
          if (casesResult.length !== count) {
            const countError = document.createElement("div");
            countError.style.padding = "12px 16px";
            countError.style.backgroundColor = "#fff4f4";
            countError.style.color = "#d1242f";
            countError.style.borderBottom = "1px solid #ffd8d8";
            countError.textContent = `Error: Expected ${count} tests, but ran ${casesResult.length}`;
            resultContainer.appendChild(countError);
          }

          // 添加测试结果列表
          const resultList = document.createElement("div");
          resultList.style.padding = "0";

          casesResult.forEach((e) => {
            const itemTitle = e.name;
            const itemStatus = e.status;
            const listItem = document.createElement("div");
            listItem.style.padding = "8px 16px";
            listItem.style.display = "flex";
            listItem.style.alignItems = "center";
            listItem.style.borderBottom = "1px solid #f0f0f0";

            if (itemStatus === "error") {
              listItem.style.backgroundColor = "#fff4f4";
              listItem.innerHTML = `
                <span style="color:#d1242f; margin-right:8px">✖</span>
                <span style="flex:1">${itemTitle}</span>
                <span style="color:#d1242f">${e.error || "Test failed"}</span>
              `;
            } else {
              listItem.style.backgroundColor = "#f8f8f8";
              listItem.innerHTML = `
                <span style="color:#2da44e; margin-right:8px">✓</span>
                <span style="flex:1">${itemTitle}</span>
                <span style="color:#656d76">${
                  itemStatus === "skipped" ? "skipped" : "passed"
                }</span>
              `;
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
