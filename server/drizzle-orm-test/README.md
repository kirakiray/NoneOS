# Drizzle ORM 测试示例

这是一个使用 Drizzle ORM 与 SQLite 数据库的示例项目，采用 ES 模块和 JavaScript，并兼容 Bun.js 环境。

## 功能特性

- 使用 SQLite 作为数据库
- ES 模块 (ESM) 支持
- JavaScript 实现
- 兼容 Node.js 和 Bun.js 环境
- 在 Bun.js 中使用其自带的 SQLite 功能
- 包含用户、帖子和评论三个表的完整示例
- 演示了常见的数据库操作：
  - 插入数据
  - 查询数据
  - 更新数据
  - 删除数据
  - 关联查询
  - 聚合查询

## 安装依赖

```bash
npm install
```

## 运行示例

### 在 Node.js 环境中运行：
```bash
# 运行示例
npm run dev

# 运行迁移（如果需要）
npm run migrate
```

### 在 Bun.js 环境中运行：
```bash
# 直接使用 Bun 运行
bun index.js

# 或使用脚本
npm run dev:bun
```

## 项目结构

- `schema.js` - 定义数据库表结构
- `db.js` - 数据库连接配置（兼容 Bun 和 Node）
- `index.js` - 主要示例代码
- `migrate.js` - 数据库迁移脚本
- `config.js` - 配置文件