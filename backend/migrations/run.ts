import fs from 'fs';
import path from 'path';
import { query, pool } from '../src/config/db';

async function runMigrations() {
  console.log('🔄 Running database migrations...');

  const migrationsDir = path.join(__dirname);
  const migrationFiles = [
    '001_auth_schema.sql',
    '002_books_schema.sql',
    '003_tickets_schema.sql',
  ];

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Warning: Migration file not found: ${file}`);
      continue;
    }

    console.log(`  Executing: ${file}`);
    const sql = fs.readFileSync(filePath, 'utf-8');
    await query(sql);
  }

  console.log('✅ All migrations applied successfully!');
}

if (require.main === module) {
  runMigrations()
    .then(() => pool.end())
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      pool.end();
      process.exit(1);
    });
}

export { runMigrations };
