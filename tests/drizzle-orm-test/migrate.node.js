
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './db.node.js';

migrate(db, { migrationsFolder: './drizzle' });
