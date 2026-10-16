import mysql from 'mysql2/promise';
import env from './env.js';

// Create a MySQL connection pool using the configuration from env.ts
export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Function to test the database connection
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    console.log('[DB] Connected to MySQL successfully.');
    connection.release(); // Release the connection back to the pool after testing
    return true;
  } catch (error) {
    console.warn('[DB] Warning: MySQL connection failed or not yet started:', (error as Error).message);
    return false;
  }
}
