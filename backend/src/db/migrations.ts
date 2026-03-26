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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Database migrations completed');
  } finally {
    client.release();
  }
}

export async function createAdminUser(username: string, password: string): Promise<void> {
  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      console.log('Admin user already exists');
      return;
    }

    const hash = await bcrypt.hash(password, 12);
    await client.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [username, hash]);
    console.log(`Admin user "${username}" created`);
  } finally {
    client.release();
  }
}
