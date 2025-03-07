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
      return div;
    }

    throw new Error("assert error");
  } catch (error) {
    div.innerHTML = `
      <span class="error">✗</span> ${testName}<br>
      Error: ${error.message}
    `;
  }
  return div;
}

export function initTestContainer(title) {
  document.body.innerHTML = `
    <h1>${title}</h1>
    <div id="results"></div>
     <style>
      .success { color: green; }
      .error { color: red; }
      .test-case { margin: 10px 0; }
    </style>
  `;
  return document.getElementById("results");
}
