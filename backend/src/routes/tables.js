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

function buildWhere(conditions, logic, validCols, searchExpr, dbType) {
  const params = [];
  const safeLogic = logic === 'OR' ? 'OR' : 'AND';

  const parts = conditions.map(({ column, filterType = 'contains', value }) => {
    if (!validCols.includes(column)) throw new Error(`Invalid column: ${column}`);
    if (!value || !String(value).trim()) throw new Error('Search value is required for all conditions');

    const expr = searchExpr(column, dbType);
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
    params.push(filterValue);
    return `${expr} ${op} $${params.length}`;
  });

  return { whereClause: `WHERE ${parts.join(` ${safeLogic} `)}`, params };
}

router.post('/search', async (req, res) => {
  const { table, conditions, logic = 'AND', page = 1, pageSize = 50 } = req.body;

  if (!db.isConnected()) return res.status(400).json({ error: 'Not connected to database' });
  if (!Array.isArray(conditions) || conditions.length === 0)
    return res.status(400).json({ error: 'conditions array is required' });

  const config = TABLE_CONFIG[table];
  if (!config) return res.status(400).json({ error: `Unknown table: ${table}` });

  const validCols = config.searchColumns.map(c => c.value);
  const dbType = db.getType();
  const schema = dbType === 'postgres' ? 'public' : 'dbo';

  let whereClause, params;
  try {
    ({ whereClause, params } = buildWhere(conditions, logic, validCols, config.searchExpr, dbType));
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const offset = (page - 1) * pageSize;
  const orderByExpr = dbType === 'postgres'
    ? `${config.orderBy} NULLS LAST`
    : `COALESCE(CAST(${config.orderBy} AS NVARCHAR(MAX)), '')`;
  const n = params.length;

  const countSql = `${config.countSelect(schema)} ${whereClause}`;
  const dataSql = dbType === 'postgres'
    ? `${config.dataSelect(schema)} ${whereClause} ORDER BY ${orderByExpr} LIMIT $${n + 1} OFFSET $${n + 2}`
    : `${config.dataSelect(schema)} ${whereClause} ORDER BY ${orderByExpr} OFFSET $${n + 1} ROWS FETCH NEXT $${n + 2} ROWS ONLY`;

  try {
    const [countRows, dataRows] = await Promise.all([
      db.query(countSql, params),
      db.query(dataSql, [...params, pageSize, offset]),
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
  const { tableConfig, conditions, logic = 'AND', page = 1, pageSize = 50 } = req.body;

  if (!db.isConnected()) return res.status(400).json({ error: 'Not connected to database' });
  if (!Array.isArray(conditions) || conditions.length === 0)
    return res.status(400).json({ error: 'conditions array is required' });
  if (!tableConfig?.tableName) return res.status(400).json({ error: 'tableConfig.tableName is required' });

  try {
    const tableName = sanitizeIdent(tableConfig.tableName);
    const dbType = db.getType();
    const defaultSchema = dbType === 'postgres' ? 'public' : 'dbo';
    const schema = sanitizeIdent(tableConfig.schema || defaultSchema);
    const orderBy = sanitizeIdent(tableConfig.orderBy || 'id');
    const tableRef = `${schema}.${tableName}`;
    const validCols = (tableConfig.searchColumns || []).map(c => c.value || c);

    const searchExprFn = (col, dbType) => {
      sanitizeIdent(col);
      return dbType === 'postgres' ? `${col}::text` : `CAST(${col} AS NVARCHAR(MAX))`;
    };

    let whereClause, params;
    try {
      ({ whereClause, params } = buildWhere(conditions, logic, validCols, searchExprFn, dbType));
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const offset = (page - 1) * pageSize;
    const orderByExpr = dbType === 'postgres'
      ? `${orderBy} NULLS LAST`
      : `COALESCE(CAST(${orderBy} AS NVARCHAR(MAX)), '')`;
    const n = params.length;

    const countSql = `SELECT COUNT(*) AS total FROM ${tableRef} ${whereClause}`;
    const dataSql = dbType === 'postgres'
      ? `SELECT * FROM ${tableRef} ${whereClause} ORDER BY ${orderByExpr} LIMIT $${n + 1} OFFSET $${n + 2}`
      : `SELECT * FROM ${tableRef} ${whereClause} ORDER BY ${orderByExpr} OFFSET $${n + 1} ROWS FETCH NEXT $${n + 2} ROWS ONLY`;

    const [countRows, dataRows] = await Promise.all([
      db.query(countSql, params),
      db.query(dataSql, [...params, pageSize, offset]),
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
