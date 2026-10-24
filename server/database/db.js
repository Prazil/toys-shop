const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

let dbInstance = null;
const dbDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dbDir, 'giftshop.sqlite');

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

async function getDatabase() {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();
  let db;

  if (fs.existsSync(dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
      console.log('Loaded existing SQLite database from', dbPath);
    } catch (err) {
      console.error('Failed to load database file, creating fresh:', err);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
    console.log('Created fresh in-memory SQLite database');
  }

  // Persist helper
  function saveToDisk() {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      const tempPath = dbPath + '.tmp';
      fs.writeFileSync(tempPath, buffer);
      fs.renameSync(tempPath, dbPath);
    } catch (e) {
      console.error('Error saving SQLite database to disk:', e);
    }
  }

  let inTransaction = false;

  // Wrapper with easy query methods
  const dbWrapper = {
    raw: db,
    save: saveToDisk,

    run(sql, params = []) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      stmt.step();
      stmt.free();
      // Fetch last inserted ID immediately before saveToDisk/export can reset it
      const idRes = db.exec("SELECT last_insert_rowid() AS id");
      const lastId = idRes && idRes[0] && idRes[0].values && idRes[0].values[0] ? idRes[0].values[0][0] : null;
      if (!inTransaction) {
        saveToDisk();
      }
      return { lastInsertRowid: lastId };
    },

    exec(sql) {
      db.exec(sql);
      if (!inTransaction) {
        saveToDisk();
      }
    },

    query(sql, params = []) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    },

    queryOne(sql, params = []) {
      const rows = this.query(sql, params);
      return rows.length > 0 ? rows[0] : null;
    },

    transaction(fn) {
      inTransaction = true;
      try {
        const result = fn(this);
        inTransaction = false;
        saveToDisk();
        return result;
      } catch (err) {
        inTransaction = false;
        throw err;
      }
    }
  };

  dbInstance = dbWrapper;
  return dbWrapper;
}

module.exports = { getDatabase };
