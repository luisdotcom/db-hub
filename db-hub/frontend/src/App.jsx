
import { useState } from 'react';
import Header from './components/Header';
import DatabaseExplorer from './components/DatabaseExplorer';
import QueryEditor from './components/QueryEditor';
import QueryResults from './components/QueryResults';
import Login from './components/Login';
import { executeQuery, getConnectionStringForDb } from './services/databaseService';
import { useToast } from './contexts/ToastContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.css';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedDatabase, setSelectedDatabase] = useState('mysql');
  const [customConnection, setCustomConnection] = useState('');
  const [currentDbName, setCurrentDbName] = useState(null);
  const [queryResult, setQueryResult] = useState(null);
  const [queryError, setQueryError] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [externalQuery, setExternalQuery] = useState('');
  const toast = useToast();


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

  const handleLoadQuery = (query) => {
    setExternalQuery(query);
    toast.info('Query loaded into editor');
  };

  const handleExecuteQuery = async (query) => {
    setIsExecuting(true);
    setQueryError(null);
    setQueryResult(null);

    try {

      const isCustomConnection = selectedDatabase.startsWith('custom_');
      const dbType = isCustomConnection ? 'custom' : selectedDatabase;
      let connectionString = isCustomConnection ? customConnection : null;

      if (isCustomConnection && currentDbName) {
        connectionString = getConnectionStringForDb(customConnection, currentDbName);
      }

      const result = await executeQuery(dbType, query, connectionString);
      setQueryResult(result);

      if (result.success) {
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
    } finally {
      setIsExecuting(false);
    }
  };

  const handleObjectSelect = (type, name) => {

    toast.info(`Selected ${type}: ${name}`);
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

  return (
    <div className="app">
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
          <div className="main-panel">
            <QueryEditor
              onExecute={handleExecuteQuery}
              isExecuting={isExecuting}
              selectedDatabase={selectedDatabase}
              externalQuery={externalQuery}
              onQueryChange={setExternalQuery}
            />
            <QueryResults result={queryResult} error={queryError} />
          </div>
        </div>
      </main>
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
