import { drizzle } from "drizzle-orm/better-sqlite3";

// 检测是否在 Bun 环境中
let sqlite;
let _db;
if (typeof Bun !== "undefined") {
  // 在 Bun 环境中使用 Bun SQLite
  sqlite = new Bun.Sqlite("./sqlite.db");
  // 为 Bun SQLite 创建兼容 better-sqlite3 的接口
  const bunDb = {
    prepare: (query) => {
      const stmt = sqlite.query(query);
      return {
        run: (...params) => {
          const result = stmt.run(...params);
          return {
            changes: sqlite.changes,
            lastInsertRowid: sqlite.lastInsertRowID,
          };
        },
        all: (...params) => stmt.all(...params),
        get: (...params) => stmt.get(...params),
      };
    },
    transaction: (fn) => {
      return (...args) => {
        sqlite.transaction(() => fn(...args));
      };
    },
    close: () => sqlite.close(),
  };

  _db = drizzle(bunDb, {
    // 指定使用 Bun 环境
    logger: false,
  });
} else {
  // 在 Node 环境中使用 better-sqlite3
  const Database = (await import("better-sqlite3")).default;
  sqlite = new Database("./sqlite.db");
  _db = drizzle(sqlite);
}

export const db = _db;
