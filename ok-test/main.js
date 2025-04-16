let resultsContainer;

function initTestContainer(title) {
  const div = document.createElement("div");
  div.innerHTML = `
    <h1>${title}</h1>
    <div class="test-info">UA: ${navigator.userAgent}</div>
    <div id="results"></div>
     <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        line-height: 1.5;
        padding: 20px;
        max-width: 1200px;
        margin: 0 auto;
        background-color: #f8f8f8;
        color: #333;
      }
      h1 {
        color: #333;
        border-bottom: 1px solid #ddd;
        padding-bottom: 10px;
        margin-bottom: 20px;
      }
      .test-info {
        color: #666;
        margin-bottom: 20px;
        font-size: 14px;
      }
      #results {
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        padding: 16px;
      }
      .success { 
        color: #2e7d32; 
        font-weight: bold;
      }
      .error { 
        color: #d32f2f; 
        font-weight: bold;
      }
      .test-case { 
        margin: 12px 0; 
        padding: 12px;
        border-left: 4px solid #eee;
        transition: background-color 0.2s;
      }
      .test-case:hover {
        background-color: #f5f5f5;
      }
      .test-name {
        font-weight: 500;
        margin-left: 8px;
      }
      .result-content, .error-message {
        margin-top: 8px;
        padding: 8px;
        background-color: #f5f5f5;
        border-radius: 4px;
        font-family: monospace;
        white-space: pre-wrap;
        overflow-x: auto;
      }
      .error-message {
        background-color: #ffebee;
      }
      
      /* 暗色模式适配 */
      @media (prefers-color-scheme: dark) {
        body {
          background-color: #121212;
          color: #e0e0e0;
        }
        h1 {
          color: #e0e0e0;
          border-bottom: 1px solid #444;
        }
        .test-info {
          color: #aaa;
        }
        #results {
          background-color: #1e1e1e;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        }
        .success {
          color: #81c784;
        }
        .error {
          color: #e57373;
        }
        .test-case {
          border-left: 4px solid #444;
        }
        .test-case:hover {
          background-color: #2a2a2a;
        }
        .result-content, .error-message {
          background-color: #2a2a2a;
          color: #e0e0e0;
        }
        .error-message {
          background-color: #3c2626;
        }
      }
    </style>
  `;
  document.body.append(div);
  resultsContainer = document.getElementById("results");
}
initTestContainer(document.querySelector("title").innerText);

export async function test(testName, testFn, options = { stringify: true }) {
  const div = document.createElement("div");
  div.className = "test-case";
  try {
    const result = await testFn();

    if (result.assert) {
      const content =
        typeof result.content === "object"
          ? JSON.stringify(result.content, null, 2)
          : result.content;

      div.innerHTML = `
        <div>
          <span class="success">✓</span>
          <span class="test-name">${testName}</span>
        </div>
        <div class="result-content">${content}</div>
      `;

      resultsContainer.appendChild(div);
      return;
    }

    if (typeof result.content === "object") {
      throw new Error(JSON.stringify(result.content, null, 2));
    }

    throw new Error(result.content);
  } catch (error) {
    div.innerHTML = `
      <div>
        <span class="error">✗</span>
        <span class="test-name">${testName}</span>
      </div>
      <div class="error-message">${error.message}</div>
    `;
    console.error(error);
  }

  resultsContainer.appendChild(div);
}
