const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/test', async (req, res) => {
  const { type, host, port, user, password, database } = req.body;
  if (!type || !host || !user || !database) {
    return res.status(400).json({ error: 'Required: type, host, user, database' });
  }
  try {
    await db.connect({ type, host, port, user, password, database });
    res.json({ success: true, message: `Connected to ${type} "${database}" on ${host}` });
  } catch (err) {
    console.error('[CONNECTION ERROR]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/disconnect', async (_req, res) => {
  try {
    await db.disconnect();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/status', (_req, res) => {
  res.json({ connected: db.isConnected(), type: db.getType() });
});

module.exports = router;
