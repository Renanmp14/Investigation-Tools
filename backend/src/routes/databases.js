const express = require('express');
const router = express.Router();
const PostgresDB = require('../db/postgres');
const SqlServerDB = require('../db/sqlserver');

router.post('/list', async (req, res) => {
  const { type, host, port, user, password } = req.body;
  if (!type || !host || !user) {
    return res.status(400).json({ error: 'Required: type, host, user' });
  }

  let driver = null;
  try {
    const defaultDatabase = type === 'postgres' ? 'postgres' : 'master';
    driver = type === 'postgres' ? new PostgresDB() : new SqlServerDB();
    await driver.connect({ host, port, user, password, database: defaultDatabase });

    const sql = type === 'postgres'
      ? "SELECT datname AS name FROM pg_database WHERE datistemplate = false ORDER BY datname"
      : "SELECT name FROM sys.databases WHERE database_id > 4 ORDER BY name";

    const rows = await driver.query(sql);
    res.json({ databases: rows.map(r => r.name || r.Name).filter(Boolean) });
  } catch (err) {
    console.error('[DATABASES ERROR]', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (driver) {
      try { await driver.disconnect(); } catch (_) {}
    }
  }
});

module.exports = router;
