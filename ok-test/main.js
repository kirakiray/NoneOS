import "./components/test-container.js";
import "./components/test-case.js";

let resultsContainer;

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
      resultsContainer.appendChild(testCase);
      return;
    }

    const errorContent =
      typeof result.content === "object"
        ? JSON.stringify(result.content, null, 2)
        : result.content;

    throw new Error(errorContent);
  } catch (error) {
    testCase.setAttribute("status", "error");
    testCase.setAttribute("error", error.stack || error.message);
    console.error(error);
  }

  resultsContainer.appendChild(testCase);
}
