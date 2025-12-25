
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { db } from './db.bun.js';

migrate(db, { migrationsFolder: './drizzle' });
