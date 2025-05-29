export class TestCase extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (this.hasAttribute("name")) {
      this.render();
    }
  }

  static get observedAttributes() {
    return ["name", "status", "content", "error"];
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const name = this.getAttribute("name") || "";
    const status = this.getAttribute("status") || "error";
    const content = this.getAttribute("content") || "";
    const error = this.getAttribute("error") || "";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          /* 使用与 test-container 相同的颜色变量 */
          --background-color: #f8f8f8;
          --text-color: #333;
          --border-color: #ddd;
          --secondary-text-color: #666;
          --results-bg-color: white;
          --shadow-color: rgba(0, 0, 0, 0.05);
          --success-color: #2e7d32;
          --error-color: #d32f2f;
          --content-bg-color: #f5f5f5;
          --error-bg-color: #ffebee;
        }
        
        :host {
          display: block;
          margin: 12px 0; 
          padding: 12px;
          border-left: 4px solid var(--border-color);
          transition: background-color 0.2s;
        }
        :host(:hover) {
          background-color: var(--content-bg-color);
        }
        .success { 
          color: var(--success-color); 
          font-weight: bold;
        }
        .error { 
          color: var(--error-color); 
          font-weight: bold;
        }
        .test-name {
          font-weight: 500;
          margin-left: 8px;
          color: var(--text-color);
        }
        .result-content, .error-message {
          margin-top: 8px;
          padding: 8px;
          background-color: var(--content-bg-color);
          border-radius: 4px;
          font-family: monospace;
          white-space: pre-wrap;
          overflow-x: auto;
          color: var(--text-color);
        }
        .error-message {
          background-color: var(--error-bg-color);
        }
        
        @media (prefers-color-scheme: dark) {
          :host {
            --background-color: #121212;
            --text-color: #e0e0e0;
            --border-color: #444;
            --secondary-text-color: #aaa;
            --results-bg-color: #1e1e1e;
            --shadow-color: rgba(0, 0, 0, 0.2);
            --success-color: #81c784;
            --error-color: #e57373;
            --content-bg-color: #2a2a2a;
            --error-bg-color: #3c2626;
          }
        }
      </style>
      <div>
        <span class="${status === "success" ? "success" : "error"}">${
      status === "success" ? "✓" : "✗"
    }</span>
        <span class="test-name">${name}</span>
      </div>
      ${content ? `<div class="result-content">${content}</div>` : ""}
      ${error ? `<div class="error-message">${error}</div>` : ""}
    `;
  }
}

customElements.define("test-case", TestCase);
