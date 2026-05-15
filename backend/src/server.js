const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const connectionRoutes = require('./routes/connection');
const tablesRoutes = require('./routes/tables');
const queryRoutes = require('./routes/query');
const databasesRoutes = require('./routes/databases');

const app = express();
const PORT = process.env.PORT || 3001;

// Detect if running as compiled pkg executable
const IS_PKG = typeof process.pkg !== 'undefined';

// Static frontend serving (used when running as standalone .exe)
const STATIC_DIR = IS_PKG
  ? path.join(path.dirname(process.execPath), 'public')
  : path.join(__dirname, '../../frontend/dist');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/connection', connectionRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/databases', databasesRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: err.message });
});

// Serve React frontend for all non-API routes (production mode)
if (fs.existsSync(STATIC_DIR)) {
  app.use(express.static(STATIC_DIR));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(STATIC_DIR, 'index.html'));
  });
}

function openBrowser(url) {
  const cmd = process.platform === 'win32'
    ? `cmd /c start "" "${url}"`
    : process.platform === 'darwin'
      ? `open "${url}"`
      : `xdg-open "${url}"`;
  exec(cmd, { shell: false }, () => {});
}

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Investigation Tools running on ${url}`);
  if (IS_PKG) {
    console.log('Opening browser...');
    setTimeout(() => openBrowser(url), 600);
  }
});
