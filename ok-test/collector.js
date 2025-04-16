export const init = async (options) => {
  const {
    cases, // 测试用例数组
    parallel = 1, // 默认并行数为1
    getCountFn, // 获取测试用例数量的函数
    timeout = 5000, // 超时时间，单位毫秒
  } = options;

  const style = document.createElement("style");
  style.textContent = `
    html,body {
      margin: 0;
      padding: 0;
      height:100%;
      --background-color: #f8f8f8;
      --text-color: #333;
      --border-color: #ddd;
      --secondary-text-color: #666;
      --results-bg-color: white;
      --shadow-color: rgba(0, 0, 0, 0.05);
      background-color: var(--background-color);
      color: var(--text-color);
    }
    /* 暗色模式适配 */
    @media (prefers-color-scheme: dark) {
      html,body {
        --background-color: #121212;
        --text-color: #e0e0e0;
        --border-color: #444;
        --secondary-text-color: #aaa;
        --results-bg-color: #1e1e1e;
        --shadow-color: rgba(0, 0, 0, 0.2);
      }
    }
    test-container{height:100%;}
  `;
  document.head.appendChild(style);

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

          // 创建结果显示容器 - 添加暗黑模式支持
          const resultContainer = document.createElement("div");
          resultContainer.style.margin = "20px 0";
          resultContainer.style.padding = "0";
          resultContainer.style.border = "1px solid var(--border-color)";
          resultContainer.style.borderRadius = "4px";
          resultContainer.style.overflow = "hidden";
          resultContainer.style.fontFamily =
            "ui-sans-serif, system-ui, sans-serif";
          resultContainer.style.color = "var(--text-color)";
          resultContainer.style.backgroundColor = "var(--results-bg-color)";

          // 添加标题
          const titleElement = document.createElement("div");
          titleElement.style.padding = "12px 16px";
          titleElement.style.backgroundColor = "var(--background-color)";
          titleElement.style.borderBottom = "1px solid var(--border-color)";
          titleElement.style.fontWeight = "600";
          titleElement.textContent = `Test Suite: ${caseTitle}`;
          resultContainer.appendChild(titleElement);

          // 查看用例数量是否相等
          if (casesResult.length !== count) {
            const countError = document.createElement("div");
            countError.style.padding = "12px 16px";
            countError.style.backgroundColor = "var(--error-bg-color)";
            countError.style.color = "var(--error-color)";
            countError.style.borderBottom = "1px solid var(--border-color)";
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
            listItem.style.borderBottom = "1px solid var(--border-color)";

            if (itemStatus === "error") {
              listItem.style.backgroundColor = "var(--error-bg-color)";
              listItem.innerHTML = `
                <span style="color:var(--error-color); margin-right:8px">✖</span>
                <span style="flex:1">${itemTitle}</span>
                <span style="color:var(--error-color)">${
                  e.error || "Test failed"
                }</span>
              `;
            } else {
              listItem.style.backgroundColor = "var(--background-color)";
              listItem.innerHTML = `
                <span style="color:var(--success-color); margin-right:8px">✓</span>
                <span style="flex:1">${itemTitle}</span>
                <span style="color:var(--secondary-text-color)">${
                  itemStatus === "skipped" ? "skipped" : "passed"
                }</span>
              `;
            }

            resultList.appendChild(listItem);
          });

          // 添加全局样式变量
          const style = document.createElement("style");
          style.textContent = `
            :root {
              --background-color: #f8f8f8;
              --text-color: #333;
              --border-color: #e5e5e5;
              --secondary-text-color: #666;
              --results-bg-color: white;
              --success-color: #2da44e;
              --error-color: #d1242f;
              --error-bg-color: #fff4f4;
            }
            @media (prefers-color-scheme: dark) {
              :root {
                --background-color: #121212;
                --text-color: #e0e0e0;
                --border-color: #444;
                --secondary-text-color: #aaa;
                --results-bg-color: #1e1e1e;
                --success-color: #81c784;
                --error-color: #e57373;
                --error-bg-color: #3c2626;
              }
            }
          `;
          document.head.appendChild(style);

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
