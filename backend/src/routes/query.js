const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/execute', async (req, res) => {
  const { sql } = req.body;
  if (!sql || !sql.trim()) return res.status(400).json({ error: 'SQL query is required' });
  if (!db.isConnected()) return res.status(400).json({ error: 'Not connected to database' });

  try {
    const start = Date.now();
    const rows = await db.query(sql.trim());
    const duration = Date.now() - start;
    res.json({ data: rows, rowCount: rows.length, duration });
  } catch (err) {
    console.error('[QUERY ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
