import { pool } from './index';
import bcrypt from 'bcrypt';

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS nodes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL DEFAULT '',
        ip VARCHAR(255) NOT NULL,
        port INTEGER NOT NULL,
        token VARCHAR(255) NOT NULL,
        domain VARCHAR(255) NOT NULL DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add domain column to existing nodes table (migration)
    await client.query(`
      ALTER TABLE nodes ADD COLUMN IF NOT EXISTS domain VARCHAR(255) NOT NULL DEFAULT '';
    `);

    console.log('Database migrations completed');
  } finally {
    client.release();
  }
}

export async function createAdminUser(username: string, password: string): Promise<void> {
  const client = await pool.connect();
  try {
    const hash = await bcrypt.hash(password, 12);
    await client.query(
      `INSERT INTO users (username, password_hash) VALUES ($1, $2)
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [username, hash]
    );
    console.log(`Admin user "${username}" created or updated`);
  } finally {
    client.release();
  }
}
