const sql = require('mssql');

class SqlServerDB {
  constructor() {
    this.pool = null;
  }

  async connect(config) {
    this.pool = await sql.connect({
      user: config.user,
      password: config.password,
      server: config.host,
      port: Number(config.port) || 1433,
      database: config.database,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        connectTimeout: 5000,
      },
    });
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }

  async query(sqlText, params = []) {
    const request = this.pool.request();
    let processed = sqlText;
    params.forEach((p, i) => {
      request.input(`p${i + 1}`, p);
      processed = processed.replace(new RegExp(`\\$${i + 1}`, 'g'), `@p${i + 1}`);
    });
    const result = await request.query(processed);
    return result.recordset;
  }

  isConnected() {
    return this.pool !== null && this.pool.connected;
  }
}

module.exports = SqlServerDB;
