
import { db } from './db.node.js';
import { users } from './schema.js';

async function main() {
  console.log('Inserting a new user...');
  await db.insert(users).values({ name: 'John Doe', email: 'john.doe@example.com' });

  console.log('Querying all users...');
  const allUsers = await db.select().from(users);
  console.log(allUsers);
}

main();
