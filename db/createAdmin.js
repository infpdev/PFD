// scripts/createAdmin.js
import bcrypt from "bcrypt";
import { db } from "./index.js";

const hash = await bcrypt.hash("dev17u", 10);

await db.query(
  `
  INSERT INTO users (username, password_hash, role)
  VALUES ($1, $2, 'admin')
  ON CONFLICT (username) DO NOTHING
  `,
  ["dev17u", hash]
);

console.log("Admin ensured");
