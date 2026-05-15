function load(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (err) { console.error('[persistence] save error', err); }
}

export const persistence = {
  loadConnections: () => load('it_connections'),
  saveConnections: (v) => save('it_connections', v),
  loadCustomTables: () => load('it_custom_tables'),
  saveCustomTables: (v) => save('it_custom_tables', v),
  loadSavedSearches: () => load('it_saved_searches'),
  saveSavedSearches: (v) => save('it_saved_searches', v),
};
