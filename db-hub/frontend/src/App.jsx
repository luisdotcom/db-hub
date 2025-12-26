
import { useState, useEffect } from 'react';
import Header from './components/Header';
import DatabaseExplorer from './components/DatabaseExplorer';
import QueryEditor from './components/QueryEditor';
import QueryResults from './components/QueryResults';
import Login from './components/Login';
import QueryHistory from './components/QueryHistory';
import { executeQuery, getConnectionStringForDb, updateTableRow, deleteTableRow, getPrimaryKeys, addHistory } from './services/databaseService';
import { useToast } from './contexts/ToastContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useRegisterSW } from 'virtual:pwa-register/react';
import ConfirmationModal from './components/ConfirmationModal';
import TooltipController from './components/TooltipController';
import './App.css';
import { Clock } from 'lucide-react';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedDatabase, setSelectedDatabase] = useState('mysql');
  const [customConnection, setCustomConnection] = useState('');
  const [currentDbName, setCurrentDbName] = useState(null);
  const [queryResult, setQueryResult] = useState(null);
  const [queryError, setQueryError] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [externalQuery, setExternalQuery] = useState('');
  const [editorCollapsed, setEditorCollapsed] = useState(false);
  const [resultsCollapsed, setResultsCollapsed] = useState(false);
  const [queryContext, setQueryContext] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      setQueryResult(null);
      setQueryError(null);
      setCurrentDbName(null);
      setExternalQuery('');
      setQueryContext(null);
    }
  }, [isAuthenticated]);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r)
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
    },
  });


  const databaseTypeNames = {
    mysql: 'MySQL',
    postgres: 'PostgreSQL',
    sqlserver: 'SQL Server',
    custom: 'Custom'
  };

  const currentDatabaseName = currentDbName || databaseTypeNames[selectedDatabase] || '';

  const handleDatabaseSelected = (dbName) => {
    setCurrentDbName(dbName);
  };

  const handleDatabaseTypeChange = (dbType, connectionString = null) => {
    setSelectedDatabase(dbType);
    setCurrentDbName(null);
    if (connectionString) {
      setCustomConnection(connectionString);
    } else {
      setCustomConnection('');
    }
  };

  const handleCustomConnection = (connectionString) => {
    setCustomConnection(connectionString);
  };

  const handleLoadQuery = (query, metadata = null) => {
    setExternalQuery(query);
    setQueryContext(metadata);
    toast.info('Query loaded into editor');
  };

  const handleExecuteQuery = async (query) => {
    setIsExecuting(true);
    setQueryError(null);
    setQueryResult(null);

    const startTime = performance.now();

    try {
      const isCustomConnection = typeof selectedDatabase === 'string' ? selectedDatabase.startsWith('custom_') : true;
      const dbType = isCustomConnection ? 'custom' : selectedDatabase;
      let connectionString = isCustomConnection ? customConnection : null;

      if (isCustomConnection && currentDbName) {
        connectionString = getConnectionStringForDb(customConnection, currentDbName);
      }

      const result = await executeQuery(dbType, query, connectionString);
      const duration = performance.now() - startTime;
      result.executionTime = duration;
      setQueryResult(result);

      const dbUsedForHistory = currentDbName || databaseTypeNames[selectedDatabase] || selectedDatabase;

      try {
        await addHistory(
          query,
          dbUsedForHistory,
          'success',
          duration,
          result.rows_affected || (result.rows ? result.rows.length : 0)
        );
      } catch (histError) {
        console.warn("Failed to save history:", histError);
      }


      if (result.success) {
        if (result.rows && result.rows.length > 0) {
          setResultsCollapsed(false);
        }
        if (result.rows_affected !== null && result.rows_affected !== undefined) {
          toast.success(`Query executed: ${result.rows_affected} row(s) affected`);
        } else {
          toast.success(`Query executed: ${result.rows?.length || 0} row(s) returned`);
        }
      } else {
        toast.error(`Query failed: ${result.message}`);
      }
    } catch (error) {
      setQueryError(error.message);
      toast.error(`Error: ${error.message}`);

      const duration = performance.now() - startTime;
      const dbUsedForHistory = currentDbName || databaseTypeNames[selectedDatabase] || selectedDatabase;

      try {
        await addHistory(
          query,
          dbUsedForHistory,
          'error',
          duration,
          0
        );
      } catch (histError) {
        console.warn("Failed to save error history:", histError);
      }

    } finally {
      setIsExecuting(false);
    }
  };

  const handleHistorySelect = (queryText) => {
    setExternalQuery(queryText);
    setShowHistory(false);
    toast.info("Query restored from history");
  };

  const handleObjectSelect = (type, name) => {
    toast.info(`Selected ${type}: ${name}`);
  };

  const handleUpdateRow = async (rowIndex, rowData, newRowData) => {
    try {
      if (!queryContext || !queryContext.tableName || !queryContext.primaryKeys) {
        throw new Error("Missing table context for update");
      }

      const isCustomConnection = typeof selectedDatabase === 'string' ? selectedDatabase.startsWith('custom_') : true;
      const dbType = isCustomConnection ? 'custom' : selectedDatabase;
      let connectionString = isCustomConnection ? customConnection : null;
      if (isCustomConnection && currentDbName) {
        connectionString = getConnectionStringForDb(customConnection, currentDbName);
      }

      const pkData = {};
      queryContext.primaryKeys.forEach(pk => {
        pkData[pk] = rowData[pk];
      });

      const success = await updateTableRow(dbType, queryContext.tableName, pkData, newRowData, connectionString);

      if (success) {
        toast.success("Row updated successfully");
        const newRows = [...queryResult.rows];
        newRows[rowIndex] = { ...newRows[rowIndex], ...newRowData };
        setQueryResult({ ...queryResult, rows: newRows });
        return true;
      } else {
        toast.error("Failed to update row");
        return false;
      }
    } catch (error) {
      toast.error(`Update error: ${error.message}`);
      return false;
    }
  };

  const handleDeleteRow = async (rowIndex, rowData) => {
    try {
      if (!queryContext || !queryContext.tableName || !queryContext.primaryKeys) {
        throw new Error("Missing table context for deletion");
      }

      const isCustomConnection = typeof selectedDatabase === 'string' ? selectedDatabase.startsWith('custom_') : true;
      const dbType = isCustomConnection ? 'custom' : selectedDatabase;
      let connectionString = isCustomConnection ? customConnection : null;
      if (isCustomConnection && currentDbName) {
        connectionString = getConnectionStringForDb(customConnection, currentDbName);
      }

      const pkData = {};
      queryContext.primaryKeys.forEach(pk => {
        pkData[pk] = rowData[pk];
      });

      const success = await deleteTableRow(dbType, queryContext.tableName, pkData, connectionString);

      if (success) {
        toast.success("Row deleted successfully");
        const newRows = queryResult.rows.filter((_, index) => index !== rowIndex);
        setQueryResult({ ...queryResult, rows: newRows, rows_affected: (queryResult.rows_affected || 0) + 1 });
        return true;
      } else {
        toast.error("Failed to delete row");
        return false;
      }
    } catch (error) {
      toast.error(`Delete error: ${error.message}`);
      return false;
    }
  };


  if (isLoading) {
    return (
      <div className="app" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '14px',
        color: 'var(--text-secondary)'
      }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }



  const toggleEditor = () => {
    setEditorCollapsed(!editorCollapsed);
    if (!editorCollapsed && resultsCollapsed) {
    }
  };

  const toggleResults = () => {
    setResultsCollapsed(!resultsCollapsed);
  };

  let layoutClass = 'layout-split';
  if (editorCollapsed && !resultsCollapsed) {
    layoutClass = 'layout-results-full';
  } else if (!editorCollapsed && resultsCollapsed) {
    layoutClass = 'layout-editor-full';
  } else if (editorCollapsed && resultsCollapsed) {
    layoutClass = 'layout-collapsed-both';
  }

  return (
    <div className="app">
      <QueryHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelectQuery={handleHistorySelect}
      />

      <Header
        selectedDatabase={selectedDatabase}
        onDatabaseChange={handleDatabaseTypeChange}
        onCustomConnection={handleCustomConnection}
      />
      <main className="main-content">
        <div className="layout-container">
          <aside className="left-panel">
            <DatabaseExplorer
              selectedDatabase={selectedDatabase}
              customConnection={customConnection}
              databaseName={currentDatabaseName}
              onObjectSelect={handleObjectSelect}
              onLoadQuery={handleLoadQuery}
              onDatabaseSelected={handleDatabaseSelected}
            />
          </aside>
          <div className={`main-panel ${layoutClass}`}>
            <QueryEditor
              onExecute={handleExecuteQuery}
              isExecuting={isExecuting}
              selectedDatabase={selectedDatabase}
              externalQuery={externalQuery}
              onQueryChange={setExternalQuery}
              isCollapsed={editorCollapsed}
              onToggleCollapse={toggleEditor}
              onHistoryClick={() => setShowHistory(true)}
            />
            <QueryResults
              result={queryResult}
              error={queryError}
              isCollapsed={resultsCollapsed}
              onToggleCollapse={toggleResults}
              onUpdateRow={handleUpdateRow}
              onDeleteRow={handleDeleteRow}
              canEdit={!!(queryContext?.tableName && queryContext?.primaryKeys?.length > 0)}
              primaryKeys={queryContext?.primaryKeys || []}
            />
          </div>
        </div>
      </main>
      <TooltipController />
      <ConfirmationModal
        isOpen={needRefresh}
        onClose={() => setNeedRefresh(false)}
        onConfirm={() => updateServiceWorker(true)}
        title="Update Available"
        message="A new version of the application is available. Reload to update?"
        confirmText="Reload"
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
