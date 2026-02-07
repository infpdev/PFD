import pkg from "pg";
const { Pool } = pkg;
const { types } = pkg;
import dotenv from "dotenv";
dotenv.config({ quiet: true });

export function createPostgresDB() {
  types.setTypeParser(1082, (val) => val); // DATE → string

  const isLocal =
    process.env.DATABASE_URL?.includes("localhost") ||
    process.env.DATABASE_URL?.includes("127.0.0.1");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    family: 4, 
  });

  return {
    async query(sql, params = []) {
      const res = await pool.query(sql, params);
      return res.rows;
    },
    async run(sql, params = []) {
      return pool.query(sql, params);
    },
  };
}
