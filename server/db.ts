import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a new pool with better connection handling for concurrent users
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 50, // 동시 접속 지원을 위해 증가
  min: 5,  // 최소 연결 수 유지
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  acquireTimeoutMillis: 60000, // 연결 획득 타임아웃
  ssl: { rejectUnauthorized: false },
  application_name: 'exchangemart', // 디버깅용 앱 이름
  keepAlive: true, // Keep-alive 활성화
  keepAliveInitialDelayMillis: 10000
});

pool.on('error', (err, client) => {
  console.error('Database pool error:', err);
});

pool.on('connect', (client) => {
  console.log('Database connected - Pool size:', pool.totalCount);
});

pool.on('acquire', (client) => {
  console.log('Database connection acquired - Active:', pool.totalCount, 'Waiting:', pool.waitingCount);
});

pool.on('release', (err, client) => {
  if (err) {
    console.error('Database connection release error:', err);
  }
});

export const db = drizzle(pool, { schema });