export async function runTest(testName, testFn, options = { stringify: true }) {
  const div = document.createElement("div");
  div.className = "test-case";
  try {
    const result = await testFn();
    div.innerHTML = `
      <span class="success">✓</span> ${testName}<br>
      Result: ${options.stringify ? JSON.stringify(result) : result}
    `;
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