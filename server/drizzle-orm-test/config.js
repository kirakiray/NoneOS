export const config = {
  database: {
    url: './sqlite.db',
    migrationsFolder: './migrations',
  },
  seed: {
    enable: true,
    count: {
      users: 10,
      posts: 20,
      comments: 50
    }
  }
};