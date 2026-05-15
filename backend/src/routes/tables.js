const express = require('express');
const router = express.Router();
const db = require('../db');
const TABLE_CONFIG = require('../config/tables');

router.get('/', (_req, res) => {
  const tables = Object.entries(TABLE_CONFIG).map(([id, c]) => ({
    id,
    label: c.label,
    searchColumns: c.searchColumns,
  }));
  res.json(tables);
});

router.post('/search', async (req, res) => {
  const { table, column, filterType = 'contains', value, page = 1, pageSize = 50 } = req.body;

  if (!db.isConnected()) return res.status(400).json({ error: 'Not connected to database' });
  if (!value || !value.trim()) return res.status(400).json({ error: 'Search value is required' });

  const config = TABLE_CONFIG[table];
  if (!config) return res.status(400).json({ error: `Unknown table: ${table}` });

  const validCols = config.searchColumns.map(c => c.value);
  if (!validCols.includes(column)) return res.status(400).json({ error: `Invalid column: ${column}` });

  const dbType = db.getType();
  const schema = dbType === 'postgres' ? 'public' : 'dbo';
  const searchExpr = config.searchExpr(column, dbType);

  let filterValue, op;
  if (filterType === 'equals') {
    filterValue = value;
    op = '=';
  } else {
    op = dbType === 'postgres' ? 'ILIKE' : 'LIKE';
    if (filterType === 'startsWith') filterValue = `${value}%`;
    else if (filterType === 'endsWith') filterValue = `%${value}`;
    else filterValue = `%${value}%`;
  }

  const offset = (page - 1) * pageSize;
  const orderByExpr = dbType === 'postgres'
    ? `${config.orderBy} NULLS LAST`
    : `COALESCE(CAST(${config.orderBy} AS NVARCHAR(MAX)), '')`;

  const countSql = `${config.countSelect(schema)} WHERE ${searchExpr} ${op} $1`;
  const dataSql = dbType === 'postgres'
    ? `${config.dataSelect(schema)} WHERE ${searchExpr} ${op} $1 ORDER BY ${orderByExpr} LIMIT $2 OFFSET $3`
    : `${config.dataSelect(schema)} WHERE ${searchExpr} ${op} $1 ORDER BY ${orderByExpr} OFFSET $2 ROWS FETCH NEXT $3 ROWS ONLY`;

  try {
    const [countRows, dataRows] = await Promise.all([
      db.query(countSql, [filterValue]),
      db.query(dataSql, [filterValue, pageSize, offset]),
    ]);

    const total = parseInt(countRows[0]?.total ?? countRows[0]?.Total ?? 0);

    res.json({
      data: dataRows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      meta: {
        jsonColumns: config.jsonColumns,
        nameColumn: config.nameColumn,
        primaryKey: config.primaryKey,
      },
    });
  } catch (err) {
    console.error('[SEARCH ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

function sanitizeIdent(s) {
  const clean = (s || '').trim();
  if (!clean || !/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(clean)) {
    throw new Error(`Invalid SQL identifier: "${s}"`);
  }
  return clean;
}

router.post('/search-dynamic', async (req, res) => {
  const { tableConfig, column, filterType = 'contains', value, page = 1, pageSize = 50 } = req.body;

  if (!db.isConnected()) return res.status(400).json({ error: 'Not connected to database' });
  if (!value || !value.trim()) return res.status(400).json({ error: 'Search value is required' });
  if (!tableConfig?.tableName) return res.status(400).json({ error: 'tableConfig.tableName is required' });

  try {
    const tableName = sanitizeIdent(tableConfig.tableName);
    const dbType = db.getType();
    const defaultSchema = dbType === 'postgres' ? 'public' : 'dbo';
    const schema = sanitizeIdent(tableConfig.schema || defaultSchema);
    const searchCol = sanitizeIdent(column);
    const orderBy = sanitizeIdent(tableConfig.orderBy || 'id');

    const searchExpr = dbType === 'postgres'
      ? `${searchCol}::text`
      : `CAST(${searchCol} AS NVARCHAR(MAX))`;
    const tableRef = `${schema}.${tableName}`;

    let filterValue, op;
    if (filterType === 'equals') {
      filterValue = value; op = '=';
    } else {
      op = dbType === 'postgres' ? 'ILIKE' : 'LIKE';
      if (filterType === 'startsWith') filterValue = `${value}%`;
      else if (filterType === 'endsWith') filterValue = `%${value}`;
      else filterValue = `%${value}%`;
    }

    const offset = (page - 1) * pageSize;
    const orderByExpr = dbType === 'postgres'
      ? `${orderBy} NULLS LAST`
      : `COALESCE(CAST(${orderBy} AS NVARCHAR(MAX)), '')`;

    const countSql = `SELECT COUNT(*) AS total FROM ${tableRef} WHERE ${searchExpr} ${op} $1`;
    const dataSql = dbType === 'postgres'
      ? `SELECT * FROM ${tableRef} WHERE ${searchExpr} ${op} $1 ORDER BY ${orderByExpr} LIMIT $2 OFFSET $3`
      : `SELECT * FROM ${tableRef} WHERE ${searchExpr} ${op} $1 ORDER BY ${orderByExpr} OFFSET $2 ROWS FETCH NEXT $3 ROWS ONLY`;

    const [countRows, dataRows] = await Promise.all([
      db.query(countSql, [filterValue]),
      db.query(dataSql, [filterValue, pageSize, offset]),
    ]);

    const total = parseInt(countRows[0]?.total ?? countRows[0]?.Total ?? 0);

    res.json({
      data: dataRows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      meta: {
        jsonColumns: tableConfig.jsonColumns || [],
        nameColumn: tableConfig.nameColumn || orderBy,
        primaryKey: tableConfig.primaryKey || null,
      },
    });
  } catch (err) {
    console.error('[SEARCH-DYNAMIC ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
