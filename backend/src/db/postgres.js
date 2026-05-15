const { Pool } = require('pg');

class PostgresDB {
  constructor() {
    this.pool = null;
  }

  async connect(config) {
    this.pool = new Pool({
      host: config.host,
      port: Number(config.port) || 5432,
      user: config.user,
      password: config.password,
      database: config.database,
      connectionTimeoutMillis: 5000,
    });
    const client = await this.pool.connect();
    await client.query('SELECT 1');
    client.release();
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async query(sql, params = []) {
    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  isConnected() {
    return this.pool !== null;
  }
}

module.exports = PostgresDB;
