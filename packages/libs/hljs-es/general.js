import hljs from "./core.js";

import xml from "./languages/xml.js";
import javascript from "./languages/javascript.js";
import typescript from "./languages/typescript.js";
import python from "./languages/python.js";
import java from "./languages/java.js";
import cpp from "./languages/cpp.js";
import csharp from "./languages/csharp.js";
import php from "./languages/php.js";
import ruby from "./languages/ruby.js";
import swift from "./languages/swift.js";
import kotlin from "./languages/kotlin.js";
import go from "./languages/go.js";
import rust from "./languages/rust.js";
import css from "./languages/css.js";
import sql from "./languages/sql.js";
import bash from "./languages/bash.js";
import shell from "./languages/shell.js";

hljs.registerLanguage("xml", xml);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("java", java);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("csharp", csharp);
hljs.registerLanguage("php", php);
hljs.registerLanguage("ruby", ruby);
hljs.registerLanguage("swift", swift);
hljs.registerLanguage("kotlin", kotlin);
hljs.registerLanguage("go", go);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("css", css);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("shell", shell);

export const langs = [
  "javascript",
  "typescript",
  "python",
  "java",
  "cpp",
  "csharp",
  "php",
  "ruby",
  "swift",
  "kotlin",
  "go",
  "rust",
  "css",
  "sql",
  "bash",
  "shell",
];

export { hljs };
