import { db } from './db.js';
import { users, posts, comments } from './schema.js';
import { eq, and, or, sql, asc, desc, like } from 'drizzle-orm';
import { config } from './config.js';

// 在 Bun 环境中创建表
async function createTablesIfNotExists() {
  if (typeof Bun !== 'undefined') {
    console.log('在 Bun 环境中创建表...');
    
    // 创建 users 表
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        age INTEGER,
        avatar BLOB,
        created_at INTEGER DEFAULT (cast(unixepoch() as int)),
        updated_at INTEGER DEFAULT (cast(unixepoch() as int))
      )
    `);
    
    // 创建 posts 表
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        user_id INTEGER REFERENCES users(id),
        created_at INTEGER DEFAULT (cast(unixepoch() as int)),
        updated_at INTEGER DEFAULT (cast(unixepoch() as int))
      )
    `);
    
    // 创建 comments 表
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        post_id INTEGER REFERENCES posts(id),
        user_id INTEGER REFERENCES users(id),
        created_at INTEGER DEFAULT (cast(unixepoch() as int))
      )
    `);
    
    console.log('表创建完成');
  }
}

async function runExample() {
  console.log('开始 Drizzle ORM 示例...');
  
  // 在 Bun 环境中先创建表
  await createTablesIfNotExists();

  try {
    // 1. 清空测试数据
    console.log('\n--- 清空测试数据 ---');
    await db.delete(comments);
    await db.delete(posts);
    await db.delete(users);
    console.log('测试数据已清空');

    // 2. 创建用户
    console.log('\n--- 创建用户 ---');
    const newUser = await db.insert(users).values({
      name: '张三',
      email: 'zhangsan@example.com',
      age: 25
    }).returning();
    console.log('创建的用户:', newUser);

    // 3. 批量插入用户
    console.log('\n--- 批量插入用户 ---');
    const newUsers = await db.insert(users).values([
      { name: '李四', email: 'lisi@example.com', age: 30 },
      { name: '王五', email: 'wangwu@example.com', age: 28 },
      { name: '赵六', email: 'zhaoliu@example.com', age: 35 }
    ]).returning();
    console.log('批量插入的用户数量:', newUsers.length);

    // 4. 查询所有用户
    console.log('\n--- 查询所有用户 ---');
    const allUsers = await db.select().from(users);
    console.log('所有用户:', allUsers);

    // 5. 条件查询
    console.log('\n--- 查询年龄大于27的用户 ---');
    const olderUsers = await db.select().from(users).where(
      sql`${users.age} > 27`
    );
    console.log('年龄大于27的用户:', olderUsers);

    // 6. 根据ID查询特定用户
    console.log('\n--- 查询特定用户 ---');
    const specificUser = await db.select().from(users).where(
      eq(users.id, 1)
    );
    console.log('ID为1的用户:', specificUser);

    // 7. 更新用户
    console.log('\n--- 更新用户 ---');
    const updatedUser = await db.update(users)
      .set({ age: 26 })
      .where(eq(users.id, 1))
      .returning();
    console.log('更新后的用户:', updatedUser);

    // 8. 创建帖子
    console.log('\n--- 创建帖子 ---');
    const newPost = await db.insert(posts).values({
      title: '我的第一篇帖子',
      content: '这是我的第一篇帖子内容',
      userId: 1
    }).returning();
    console.log('创建的帖子:', newPost);

    // 9. 创建更多帖子
    console.log('\n--- 创建更多帖子 ---');
    const morePosts = await db.insert(posts).values([
      { title: '第二篇帖子', content: '这是第二篇帖子的内容', userId: 2 },
      { title: '第三篇帖子', content: '这是第三篇帖子的内容', userId: 1 },
      { title: '第四篇帖子', content: '这是第四篇帖子的内容', userId: 3 }
    ]).returning();
    console.log('创建的帖子数量:', morePosts.length);

    // 10. 查询帖子并关联用户
    console.log('\n--- 查询帖子及作者 ---');
    const postsWithUsers = await db
      .select({
        postId: posts.id,
        postTitle: posts.title,
        postContent: posts.content,
        userId: users.id,
        userName: users.name,
        userEmail: users.email
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .orderBy(desc(posts.id));
    console.log('帖子及作者信息:', postsWithUsers);

    // 11. 创建评论
    console.log('\n--- 创建评论 ---');
    const newComment = await db.insert(comments).values({
      content: '这是一个很棒的帖子！',
      postId: 1,
      userId: 2
    }).returning();
    console.log('创建的评论:', newComment);

    // 12. 查询评论并关联帖子和用户
    console.log('\n--- 查询评论及关联信息 ---');
    const commentsWithDetails = await db
      .select({
        commentId: comments.id,
        commentContent: comments.content,
        postId: posts.id,
        postTitle: posts.title,
        userId: users.id,
        userName: users.name
      })
      .from(comments)
      .leftJoin(posts, eq(comments.postId, posts.id))
      .leftJoin(users, eq(comments.userId, users.id));
    console.log('评论及关联信息:', commentsWithDetails);

    // 13. 聚合查询
    console.log('\n--- 用户帖子数量统计 ---');
    const userPostCount = await db
      .select({
        userId: users.id,
        userName: users.name,
        postCount: sql`count(${posts.id})`.as('postCount')
      })
      .from(users)
      .leftJoin(posts, eq(users.id, posts.userId))
      .groupBy(users.id, users.name)
      .orderBy(desc(sql`count(${posts.id})`));
    console.log('用户帖子数量统计:', userPostCount);

    // 14. 删除评论
    console.log('\n--- 删除评论 ---');
    const deletedComment = await db.delete(comments)
      .where(eq(comments.id, 1))
      .returning();
    console.log('删除的评论:', deletedComment);

    console.log('\n--- Drizzle ORM 示例完成 ---');
  } catch (error) {
    console.error('执行示例时发生错误:', error);
  }
}

// 运行示例
runExample();