import { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import { api } from '../api';
import { persistence } from '../utils/persistence';

const AppContext = createContext(null);

const EMPTY_CONDITION = () => ({ column: '', filterType: 'contains', value: '' });
const INITIAL_TAB = (id) => ({
  id,
  name: `Search ${id}`,
  selectedTable: null,
  conditions: [EMPTY_CONDITION()],
  logic: 'AND',
  page: 1,
  results: null,
  loading: false,
  error: null,
  pagination: null,
  meta: null,
});

export function AppProvider({ children }) {
  const [connection, setConnection] = useState({ connected: false, type: null, label: null });
  const [activeTab, setActiveTab] = useState('search');
  const [builtInTables, setBuiltInTables] = useState([]);
  const [customTables, setCustomTables] = useState(() => persistence.loadCustomTables());
  const [savedSearches, setSavedSearches] = useState(() => persistence.loadSavedSearches());
  const [showTableManager, setShowTableManager] = useState(false);

  const allTables = useMemo(
    () => [...builtInTables.map(t => ({ ...t, isCustom: false })), ...customTables],
    [builtInTables, customTables]
  );

  // ── Search Tabs ────────────────────────────────────────────────────────────────
  const searchTabCounter = useRef(2);
  const [searchTabs, setSearchTabs] = useState([INITIAL_TAB(1)]);
  const [activeSearchTabId, setActiveSearchTabId] = useState(1);

  const activeSearchTab = useMemo(
    () => searchTabs.find(t => t.id === activeSearchTabId) ?? searchTabs[0],
    [searchTabs, activeSearchTabId]
  );

  const selectedTable = activeSearchTab?.selectedTable ?? null;

  const updateSearchTab = useCallback((id, updates) => {
    setSearchTabs(tabs => tabs.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const addSearchTab = useCallback(() => {
    const id = searchTabCounter.current++;
    setSearchTabs(tabs => [...tabs, INITIAL_TAB(id)]);
    setActiveSearchTabId(id);
  }, []);

  const closeSearchTab = useCallback((idToClose) => {
    setSearchTabs(prev => {
      if (prev.length === 1) {
        return [INITIAL_TAB(prev[0].id)];
      }
      const idx = prev.findIndex(t => t.id === idToClose);
      const newTabs = prev.filter(t => t.id !== idToClose);
      setActiveSearchTabId(curr => {
        if (curr !== idToClose) return curr;
        return newTabs[Math.min(idx, newTabs.length - 1)].id;
      });
      return newTabs;
    });
  }, []);

  // ── SQL Tabs ───────────────────────────────────────────────────────────────────
  const sqlTabCounter = useRef(2);
  const [sqlTabs, setSqlTabs] = useState([
    { id: 1, name: 'Query 1', query: '', results: null, loading: false, error: null, duration: null },
  ]);
  const [activeSqlTabId, setActiveSqlTabId] = useState(1);

  const activeSqlTab = useMemo(
    () => sqlTabs.find(t => t.id === activeSqlTabId) ?? sqlTabs[0],
    [sqlTabs, activeSqlTabId]
  );

  const updateSqlTab = useCallback((id, updates) => {
    setSqlTabs(tabs => tabs.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const addSqlTab = useCallback((query = '', name = null) => {
    const id = sqlTabCounter.current++;
    setSqlTabs(tabs => [...tabs, {
      id,
      name: name ?? `Query ${id}`,
      query,
      results: null,
      loading: false,
      error: null,
      duration: null,
    }]);
    setActiveSqlTabId(id);
  }, []);

  const closeSqlTab = useCallback((idToClose) => {
    setSqlTabs(prev => {
      if (prev.length === 1) {
        return [{ ...prev[0], query: '', results: null, error: null, loading: false, duration: null }];
      }
      const idx = prev.findIndex(t => t.id === idToClose);
      const newTabs = prev.filter(t => t.id !== idToClose);
      setActiveSqlTabId(curr => {
        if (curr !== idToClose) return curr;
        return newTabs[Math.min(idx, newTabs.length - 1)].id;
      });
      return newTabs;
    });
  }, []);

  // ── Connections ────────────────────────────────────────────────────────────────
  const connect = useCallback(async (config) => {
    const data = await api.connect(config);
    const tableList = await api.tables();
    setBuiltInTables(tableList);
    setConnection({ connected: true, type: config.type, label: config.database });
    return data;
  }, []);

  const disconnect = useCallback(async () => {
    await api.disconnect();
    setConnection({ connected: false, type: null, label: null });
    setBuiltInTables([]);
    setSearchTabs([INITIAL_TAB(1)]);
    setActiveSearchTabId(1);
    searchTabCounter.current = 2;
  }, []);

  const selectTable = useCallback((tableId) => {
    setSearchTabs(tabs => tabs.map(t =>
      t.id === activeSearchTabId
        ? { ...t, selectedTable: tableId, conditions: [EMPTY_CONDITION()], logic: 'AND', page: 1, results: null, pagination: null, error: null }
        : t
    ));
    setActiveTab('search');
  }, [activeSearchTabId]);

  // ── Search ─────────────────────────────────────────────────────────────────────
  const search = useCallback(async (tabId, params) => {
    updateSearchTab(tabId, { loading: true, error: null });
    try {
      const table = [...builtInTables, ...customTables].find(t => t.id === params.table);
      const data = table?.isCustom
        ? await api.searchDynamic(params)
        : await api.search(params);
      updateSearchTab(tabId, {
        loading: false,
        results: data.data,
        pagination: data.pagination,
        meta: data.meta,
        page: params.page,
      });
    } catch (err) {
      updateSearchTab(tabId, { loading: false, error: err.message });
    }
  }, [builtInTables, customTables, updateSearchTab]);

  // ── SQL Execute ────────────────────────────────────────────────────────────────
  const executeSQL = useCallback(async (tabId, sql) => {
    updateSqlTab(tabId, { loading: true, error: null, results: null });
    try {
      const data = await api.execute(sql);
      updateSqlTab(tabId, { loading: false, results: data.data, duration: data.duration });
    } catch (err) {
      updateSqlTab(tabId, { loading: false, error: err.message });
    }
  }, [updateSqlTab]);

  // ── Custom Tables ──────────────────────────────────────────────────────────────
  const addCustomTable = useCallback((table) => {
    setCustomTables(prev => {
      const updated = [...prev, { ...table, isCustom: true }];
      persistence.saveCustomTables(updated);
      return updated;
    });
  }, []);

  const updateCustomTable = useCallback((table) => {
    setCustomTables(prev => {
      const updated = prev.map(t => t.id === table.id ? { ...table, isCustom: true } : t);
      persistence.saveCustomTables(updated);
      return updated;
    });
  }, []);

  const removeCustomTable = useCallback((id) => {
    setCustomTables(prev => {
      const updated = prev.filter(t => t.id !== id);
      persistence.saveCustomTables(updated);
      return updated;
    });
  }, []);

  // ── Saved Searches ─────────────────────────────────────────────────────────────
  const addSavedSearch = useCallback((search) => {
    setSavedSearches(prev => {
      const updated = [...prev, { ...search, id: Date.now() }];
      persistence.saveSavedSearches(updated);
      return updated;
    });
  }, []);

  const removeSavedSearch = useCallback((id) => {
    setSavedSearches(prev => {
      const updated = prev.filter(s => s.id !== id);
      persistence.saveSavedSearches(updated);
      return updated;
    });
  }, []);

  const importSavedSearches = useCallback((items) => {
    setSavedSearches(prev => {
      const updated = [...prev, ...items.map(s => ({ ...s, id: Date.now() + Math.random() }))];
      persistence.saveSavedSearches(updated);
      return updated;
    });
  }, []);

  return (
    <AppContext.Provider value={{
      connection, connect, disconnect,
      selectedTable, selectTable,
      activeTab, setActiveTab,
      tables: allTables,
      builtInTables, customTables, allTables,
      showTableManager, setShowTableManager,
      addCustomTable, updateCustomTable, removeCustomTable,
      searchTabs, activeSearchTabId, setActiveSearchTabId,
      activeSearchTab, updateSearchTab, addSearchTab, closeSearchTab, search,
      sqlTabs, activeSqlTabId, setActiveSqlTabId,
      activeSqlTab, updateSqlTab, addSqlTab, closeSqlTab, executeSQL,
      savedSearches, addSavedSearch, removeSavedSearch, importSavedSearches,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
