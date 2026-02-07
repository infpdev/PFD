// db/sqlite.js
import sqlite3 from "sqlite3";

export function createSqliteDB() {
  const conn = new sqlite3.Database("submissions.db");

  return {
    query(sql, params = []) {
      return new Promise((resolve, reject) => {
        conn.all(sql, params, (err, rows) =>
          err ? reject(err) : resolve(rows),
        );
      });
    },
    run(sql, params = []) {
      return new Promise((resolve, reject) => {
        conn.run(sql, params, function (err) {
          err ? reject(err) : resolve(this);
        });
      });
    },
  };
}
