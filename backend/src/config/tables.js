const TABLE_CONFIG = {
  workflowdatastudio: {
    label: 'Workflow Data Studio',
    searchColumns: [
      { value: 'nodes', label: 'nodes' },
      { value: 'edges', label: 'edges' },
      { value: 'workflow', label: 'workflow' },
    ],
    jsonColumns: ['nodes', 'edges', 'workflow'],
    primaryKey: 'workflowdatastudioid',
    nameColumn: 'wf_name',
    dataSelect: (schema) => `
      SELECT wds.workflowdatastudioid, wds.workflowstudioid,
             ws.name AS wf_name, ws.caption AS wf_caption,
             wds.nodes, wds.edges, wds.workflow, wds.ownerrule
      FROM ${schema}.workflowdatastudio wds
      LEFT JOIN ${schema}.workflowstudio ws
        ON wds.workflowstudioid = ws.workflowstudioid`,
    countSelect: (schema) => `
      SELECT COUNT(*) AS total
      FROM ${schema}.workflowdatastudio wds
      LEFT JOIN ${schema}.workflowstudio ws
        ON wds.workflowstudioid = ws.workflowstudioid`,
    searchExpr: (col, dbType) =>
      dbType === 'postgres' ? `wds.${col}::text` : `CAST(wds.${col} AS NVARCHAR(MAX))`,
    orderBy: 'ws.name',
  },

  actionsstudio: {
    label: 'Actions Studio',
    searchColumns: [
      { value: 'precommand', label: 'precommand' },
      { value: 'poscommand', label: 'poscommand' },
    ],
    jsonColumns: ['precommand', 'poscommand', 'rules'],
    primaryKey: 'actionstudioid',
    nameColumn: 'name',
    dataSelect: (schema) => `
      SELECT actionstudioid, screenstudioid, constraintstudioid,
             toscreenstudioid, toformstudioid, name, caption, tooltip, type,
             formstudioid, createdat, updatedat, rules, precommand, poscommand,
             perregister, icon, ownerrule
      FROM ${schema}.actionsstudio`,
    countSelect: (schema) => `SELECT COUNT(*) AS total FROM ${schema}.actionsstudio`,
    searchExpr: (col, dbType) =>
      dbType === 'postgres' ? `${col}::text` : `CAST(${col} AS NVARCHAR(MAX))`,
    orderBy: 'name',
  },

  formstudio: {
    label: 'Form Studio',
    searchColumns: [
      { value: 'precommand', label: 'precommand' },
      { value: 'poscommand', label: 'poscommand' },
    ],
    jsonColumns: ['precommand', 'poscommand'],
    primaryKey: 'formstudioid',
    nameColumn: 'name',
    dataSelect: (schema) => `
      SELECT formstudioid, name, caption, type, sequence, screenstudioid,
             precommand, poscommand, preload, posload, actiontype,
             createdat, updatedat, ownerrule, formeditid, forminsertid
      FROM ${schema}.formstudio`,
    countSelect: (schema) => `SELECT COUNT(*) AS total FROM ${schema}.formstudio`,
    searchExpr: (col, dbType) =>
      dbType === 'postgres' ? `${col}::text` : `CAST(${col} AS NVARCHAR(MAX))`,
    orderBy: 'name',
  },

  liststudio: {
    label: 'List Studio',
    searchColumns: [
      { value: 'filter', label: 'filter' },
      { value: 'posfilter', label: 'posfilter' },
    ],
    jsonColumns: ['filter', 'posfilter'],
    primaryKey: 'liststudioid',
    nameColumn: 'name',
    dataSelect: (schema) => `
      SELECT liststudioid, name, caption, entitystudioid,
             filter, posfilter, createdat, updatedat,
             systemstudioid, ownerrule
      FROM ${schema}.liststudio`,
    countSelect: (schema) => `SELECT COUNT(*) AS total FROM ${schema}.liststudio`,
    searchExpr: (col, dbType) =>
      dbType === 'postgres' ? `${col}::text` : `CAST(${col} AS NVARCHAR(MAX))`,
    orderBy: 'name',
  },
};

module.exports = TABLE_CONFIG;
