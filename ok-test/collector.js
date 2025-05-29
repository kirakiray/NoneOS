export const init = async (options) => {
  const {
    cases, // 测试用例数组
    parallel = 1, // 默认并行数为1
    getCountFn, // 获取测试用例数量的函数
    timeout = 5000, // 超时时间，单位毫秒
  } = options;

  // 添加样式
  addStyles();

  let hasRun = false;
  const testCases = [];
  const testContainers = []; // 存储测试容器引用

  // 收集所有测试用例并预先显示
  for (const path of cases) {
    const count = await getCaseCount(path, getCountFn);

    // 创建等待状态的测试容器
    const container = createResultContainer();
    container.appendChild(
      createTitleElement(`Test Suite: ${path} (等待运行...)`, path)
    );

    // 添加等待指示器
    const waitingIndicator = document.createElement("div");
    waitingIndicator.style.padding = "12px 16px";
    waitingIndicator.style.backgroundColor = "var(--background-color)";
    waitingIndicator.style.color = "var(--secondary-text-color)";
    waitingIndicator.style.borderBottom = "1px solid var(--border-color)";
    waitingIndicator.textContent = `等待运行 ${count} 个测试用例...`;
    container.appendChild(waitingIndicator);

    document.body.appendChild(container);
    testContainers.push(container);

    testCases.push({
      path,
      count,
      container, // 保存容器引用
      runCase: () => runTestCase(path, count, timeout, container),
    });
  }

  // 返回执行函数
  return async () => {
    if (hasRun) {
      console.log("已经执行过了");
      return;
    }
    hasRun = true;

    for (let testCase of testCases) {
      await testCase.runCase();
    }
  };
};

// 添加样式函数
const addStyles = () => {
  const style = document.createElement("style");
  style.textContent = `
    html,body {
      margin: 0;
      padding: 0;
      height:100%;
      box-sizing: border-box;
      padding-top: 1px;
      --background-color: #f8f8f8;
      --text-color: #333;
      --border-color: #ddd;
      --secondary-text-color: #666;
      --results-bg-color: white;
      --shadow-color: rgba(0, 0, 0, 0.05);
      --success-color: #2da44e;
      --error-color: #d1242f;
      --error-bg-color: #fff4f4;
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
        --success-color: #81c784;
        --error-color: #e57373;
        --error-bg-color: #3c2626;
      }
    }
    test-container{height:100%;}
  `;
  document.head.appendChild(style);
};

// 创建结果容器
const createResultContainer = () => {
  const container = document.createElement("div");
  container.style.margin = "16px";
  container.style.padding = "0";
  container.style.border = "1px solid var(--border-color)";
  container.style.borderRadius = "4px";
  container.style.overflow = "hidden";
  container.style.fontFamily = "ui-sans-serif, system-ui, sans-serif";
  container.style.color = "var(--text-color)";
  container.style.backgroundColor = "var(--results-bg-color)";
  return container;
};

// 创建标题元素
const createTitleElement = (title, path) => {
  const titleElement = document.createElement("div");
  titleElement.style.padding = "12px 16px";
  titleElement.style.backgroundColor = "var(--background-color)";
  titleElement.style.borderBottom = "1px solid var(--border-color)";
  titleElement.style.fontWeight = "600";
  titleElement.textContent = title;

  if (path) {
    const link = document.createElement("a");
    link.href = path;
    link.target = "_blank";
    link.textContent = "查看详情";
    link.style.marginLeft = "8px";
    link.style.color = "var(--secondary-text-color)";
    link.style.textDecoration = "none";
    link.style.fontSize = "14px";
    link.style.fontWeight = "normal";
    titleElement.appendChild(link);
  }
  return titleElement;
};

// 运行测试用例
const runTestCase = async (path, expectedCount, timeout, existingContainer) => {
  // 更新容器标题为"正在运行"
  const titleElement = existingContainer.querySelector("div");
  titleElement.textContent = `Test Suite: ${path} (正在运行...)`;

  const targetWindow = window.open(path, "testWindow", "width=600,height=800");
  const startTime = performance.now();

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      targetWindow.close();

      // 清空现有容器内容
      existingContainer.innerHTML = "";

      // 添加超时标题
      existingContainer.appendChild(
        createTitleElement(`Test Suite: ${path} (超时)`, path)
      );

      // 添加超时错误信息
      const errorElement = document.createElement("div");
      errorElement.style.padding = "12px 16px";
      errorElement.style.backgroundColor = "var(--error-bg-color)";
      errorElement.style.color = "var(--error-color)";
      errorElement.textContent = `Error: Test timed out after ${timeout}ms`;
      existingContainer.appendChild(errorElement);

      resolve();
    }, timeout);

    targetWindow.addEventListener("message", (event) => {
      const { data } = event;
      if (data.type === "test-completed") {
        const casesResult = data.cases;
        const caseTitle = data.title;
        const duration = (performance.now() - startTime).toFixed(2);

        targetWindow.close();

        // 清空现有容器内容
        existingContainer.innerHTML = "";

        // 添加完成标题
        existingContainer.appendChild(
          createTitleElement(`Test Suite: ${caseTitle} (${duration}ms)`, path)
        );

        // 检查测试用例数量
        if (casesResult.length !== expectedCount) {
          const countError = document.createElement("div");
          countError.style.padding = "12px 16px";
          countError.style.backgroundColor = "var(--error-bg-color)";
          countError.style.color = "var(--error-color)";
          countError.style.borderBottom = "1px solid var(--border-color)";
          countError.textContent = `Error: Expected ${expectedCount} tests, but ran ${casesResult.length}`;
          existingContainer.appendChild(countError);
        }

        // 添加测试结果列表
        const resultList = document.createElement("div");
        resultList.style.padding = "0";

        casesResult.forEach((testCase) => {
          const { name, status, error } = testCase;
          const listItem = document.createElement("div");
          listItem.style.padding = "8px 16px";
          listItem.style.display = "flex";
          listItem.style.alignItems = "center";
          listItem.style.borderBottom = "1px solid var(--border-color)";

          if (status === "error") {
            listItem.style.backgroundColor = "var(--error-bg-color)";
            listItem.innerHTML = `
              <span style="color:var(--error-color); margin-right:8px">✖</span>
              <span style="flex:1">${name}</span>
              <span style="color:var(--error-color)">${
                error || "Test failed"
              }</span>
            `;
          } else {
            listItem.style.backgroundColor = "var(--background-color)";
            listItem.innerHTML = `
              <span style="color:var(--success-color); margin-right:8px">✓</span>
              <span style="flex:1">${name}</span>
              <span style="color:var(--secondary-text-color)">${
                status === "skipped" ? "skipped" : "passed"
              }</span>
            `;
          }

          resultList.appendChild(listItem);
        });

        existingContainer.appendChild(resultList);

        clearTimeout(timer);
        resolve();
      }
    });
  });
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
