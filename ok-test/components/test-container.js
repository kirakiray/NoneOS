export class TestContainer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    const title = document.querySelector("title").innerText;
    this.render(title);
  }

  render(title) {
    this.shadowRoot.innerHTML = `
      <style>
        /* :host {
          --background-color: #f8f8f8;
          --text-color: #333;
          --border-color: #ddd;
          --secondary-text-color: #666;
          --results-bg-color: white;
          --shadow-color: rgba(0, 0, 0, 0.05);
        } */

        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          line-height: 1.5;
          max-width: 1200px;
          background-color: var(--background-color);
          color: var(--text-color);
          padding: 16px;
          box-sizing: border-box;
        }
        h1 {
          color: var(--text-color);
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 10px;
          margin-bottom: 20px;
          margin-top: 0;
        }
        .test-info {
          color: var(--secondary-text-color);
          margin-bottom: 20px;
          font-size: 14px;
        }
        #results {
          background-color: var(--results-bg-color);
          border-radius: 8px;
          box-shadow: 0 2px 10px var(--shadow-color);
          padding: 16px;
        }
        
        
        /* @media (prefers-color-scheme: dark) {
          :host {
            --background-color: #121212;
            --text-color: #e0e0e0;
            --border-color: #444;
            --secondary-text-color: #aaa;
            --results-bg-color: #1e1e1e;
            --shadow-color: rgba(0, 0, 0, 0.2);
          }
        } */
      </style>
      <h1>${title}</h1>
      <div class="test-info">UA: ${navigator.userAgent}</div>
      <div id="results"></div>
    `;
  }

  get resultsContainer() {
    return this.shadowRoot.getElementById("results");
  }
}

customElements.define("test-container", TestContainer);
