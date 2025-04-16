let resultsContainer;

export function initTestContainer(title) {
  const div = document.createElement("div");
  div.innerHTML = `
    <h1>${title}</h1>
    <div>UA: ${navigator.userAgent}</div>
    <div id="results"></div>
     <style>
      .success { color: green; }
      .error { color: red; }
      .test-case { margin: 10px 0; }
    </style>
  `;
  document.body.append(div);
  resultsContainer = document.getElementById("results");
}
initTestContainer(document.querySelector("title").innerText);

export async function runTest(testName, testFn, options = { stringify: true }) {
  const div = document.createElement("div");
  div.className = "test-case";
  try {
    const result = await testFn();

    if (result.assert) {
      div.innerHTML = `
      <span class="success">✓</span> ${testName}<br>
      Result: ${
        typeof result.content === "object"
          ? JSON.stringify(result.content)
          : result.content
      }
    `;

      resultsContainer.appendChild(div);
      return;
    }

    if (typeof result.content === "object") {
      throw new Error(JSON.stringify(result.content));
    }

    throw new Error(result.content);
  } catch (error) {
    div.innerHTML = `
      <span class="error">✗</span> ${testName}<br>
      Error: ${error.message}
    `;
    console.error(error);
  }

  resultsContainer.appendChild(div);
}
