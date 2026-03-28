import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required.');
}

const pool = new Pool({ connectionString });

export interface QueryResult<T> {
  rows: T[];
}

export async function query<T extends pg.QueryResultRow>(
  sql: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  const result = await pool.query<T>(sql, params);
  return { rows: result.rows };
}
