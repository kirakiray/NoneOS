import "./components/test-container.js";
import "./components/test-case.js";

let resultsContainer;
let testCompletionTimer; // 添加计时器变量

function initTestContainer() {
  const container = document.createElement("test-container");
  document.body.appendChild(container);
  resultsContainer = container.resultsContainer;
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
}

initTestContainer();

const cases = [];

export async function test(testName, testFn, options = { stringify: true }) {
  // 清除之前的计时器
  if (testCompletionTimer) {
    clearTimeout(testCompletionTimer);
  }

  const testCase = document.createElement("test-case");
  testCase.setAttribute("name", testName);

  const itemData = {
    name: testName,
    status: "pending",
    // content: "",
  };

  cases.push(itemData);

  try {
    const result = await testFn();

    if (result.assert) {
      const content =
        typeof result.content === "object"
          ? JSON.stringify(result.content, null, 2)
          : result.content;

      testCase.setAttribute("status", "success");
      testCase.setAttribute("content", content);
      itemData.status = "success";
      itemData.content = content;
    } else {
      const errorContent =
        typeof result.content === "object"
          ? JSON.stringify(result.content, null, 2)
          : result.content;

      throw new Error(errorContent);
    }
  } catch (error) {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    testCase.setAttribute("status", "error");
    testCase.setAttribute(
      "error",
      isSafari ? error.toString() : error.stack || error.toString()
    );
    itemData.status = "error";
    itemData.content = error.stack || error.toString();
    console.error(error);
  }

  resultsContainer.appendChild(testCase);

  // 设置新的计时器，如果300毫秒内没有再次执行test方法，则添加完成元素
  testCompletionTimer = setTimeout(() => {
    const completionElement = document.createElement("button");
    completionElement.textContent = "Test execution completed";
    completionElement.dataset.testid = "test-completion-notification";
    document.body.appendChild(completionElement);
    testCompletionTimer = null;

    // 判断是否有top，有的话发送成功通知，包含了测试完成的数量
    if (window.opener) {
      // 发送通知
      window.postMessage({
        type: "test-completed",
        cases, // 所有用例
        title: document.title.trim(),
      });
    }
  }, 300);
}
