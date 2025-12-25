import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { users, posts, comments } from './schema.js';
import { db } from './db.js';

// 执行迁移
try {
  console.log('开始数据库迁移...');
  // 注意：Bun 环境下可能不支持 migrate 函数，所以这里需要根据环境调整
  if (typeof Bun !== 'undefined') {
    console.log('在 Bun 环境中，跳过迁移步骤（需要手动创建表结构）');
    // 在 Bun 环境中，我们将在 index.js 中处理表创建
  } else {
    // 导入 Node 版本的 migrate
    const { migrate: nodeMigrate } = await import('drizzle-orm/better-sqlite3/migrator');
    const { drizzle } = await import('drizzle-orm/better-sqlite3');
    const Database = (await import('better-sqlite3')).default;
    
    const sqlite = new Database('./sqlite.db');
    const nodeDb = drizzle(sqlite);
    
    nodeMigrate(nodeDb, { migrationsFolder: './migrations' });
    sqlite.close();
    console.log('数据库迁移完成！');
  }
} catch (error) {
  console.error('数据库迁移失败:', error);
}