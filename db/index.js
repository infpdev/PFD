import { createSqliteDB } from "./sqlite.js";
import { createPostgresDB } from "./postgres.js";
import dotenv from "dotenv";
dotenv.config({ quiet: true });

const isProd = process.env.NODE_ENV === "production";

export const db = isProd ? createPostgresDB() : createSqliteDB();
