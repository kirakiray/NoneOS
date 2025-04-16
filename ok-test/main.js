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
    }
    test-container{height:100%;}
  `;
  document.head.appendChild(style);
}

initTestContainer();

export async function test(testName, testFn, options = { stringify: true }) {
  // 清除之前的计时器
  if (testCompletionTimer) {
    clearTimeout(testCompletionTimer);
  }

  const testCase = document.createElement("test-case");
  testCase.setAttribute("name", testName);

  try {
    const result = await testFn();

    if (result.assert) {
      const content =
        typeof result.content === "object"
          ? JSON.stringify(result.content, null, 2)
          : result.content;

      testCase.setAttribute("status", "success");
      testCase.setAttribute("content", content);
    } else {
      const errorContent =
        typeof result.content === "object"
          ? JSON.stringify(result.content, null, 2)
          : result.content;

      throw new Error(errorContent);
    }
  } catch (error) {
    testCase.setAttribute("status", "error");
    testCase.setAttribute("error", error.stack || error.toString());
    console.error(error);
  }

  resultsContainer.appendChild(testCase);

  // 设置新的计时器，如果300毫秒内没有再次执行test方法，则添加完成元素
  testCompletionTimer = setTimeout(() => {
    const completionElement = document.createElement("div");
    completionElement.textContent = "Test execution completed";
    completionElement.style.padding = "10px";
    completionElement.style.backgroundColor = "#e6f7ff";
    completionElement.style.border = "1px solid #91d5ff";
    completionElement.style.borderRadius = "4px";
    completionElement.style.margin = "10px 0";
    completionElement.style.display = "none";
    completionElement.dataset.testCompleted = "1";
    document.body.appendChild(completionElement);
    testCompletionTimer = null;
  }, 300);
}
