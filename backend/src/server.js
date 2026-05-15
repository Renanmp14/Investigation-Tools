const express = require('express');
const cors = require('cors');
const connectionRoutes = require('./routes/connection');
const tablesRoutes = require('./routes/tables');
const queryRoutes = require('./routes/query');
const databasesRoutes = require('./routes/databases');

const app = express();
const PORT = process.env.PORT || 3001;

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

app.listen(PORT, () => {
  console.log(`Investigation Tools Backend running on http://localhost:${PORT}`);
});
