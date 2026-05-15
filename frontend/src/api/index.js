const BASE = '/api';

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  connect: (config) => request('POST', '/connection/test', config),
  disconnect: () => request('POST', '/connection/disconnect'),
  status: () => request('GET', '/connection/status'),
  tables: () => request('GET', '/tables'),
  search: (params) => request('POST', '/tables/search', params),
  searchDynamic: (params) => request('POST', '/tables/search-dynamic', params),
  execute: (sql) => request('POST', '/query/execute', { sql }),
  listDatabases: (config) => request('POST', '/databases/list', config),
};
