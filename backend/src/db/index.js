const PostgresDB = require('./postgres');
const SqlServerDB = require('./sqlserver');

class DatabaseManager {
  constructor() {
    this.driver = null;
    this.dbType = null;
  }

  async connect(config) {
    if (this.driver) {
      try { await this.disconnect(); } catch (_) {}
    }
    this.driver = config.type === 'postgres' ? new PostgresDB() : new SqlServerDB();
    await this.driver.connect(config);
    this.dbType = config.type;
  }

  async disconnect() {
    if (this.driver) {
      await this.driver.disconnect();
      this.driver = null;
      this.dbType = null;
    }
  }

  async query(sql, params = []) {
    if (!this.driver) throw new Error('Not connected to database');
    return this.driver.query(sql, params);
  }

  isConnected() {
    return this.driver !== null && this.driver.isConnected();
  }

  getType() {
    return this.dbType;
  }
}

module.exports = new DatabaseManager();
