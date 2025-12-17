
import { useState } from 'react';
import { Database, CheckCircle, XCircle, Loader, Settings, Info, Zap, ChevronUp, ChevronDown } from 'lucide-react';
import { testConnection } from '../services/databaseService';
import { useToast } from '../contexts/ToastContext';
import './DatabaseSelector.css';

const DatabaseSelector = ({ selectedDatabase, onDatabaseChange, customConnection, onCustomConnectionChange }) => {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [testing, setTesting] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const toast = useToast();

  const databaseGroups = [
    {
      groupName: 'Local Databases',
      databases: [
        {
          id: 'mysql',
          name: 'MySQL',
          icon: '🐬',
          connectionString: 'mysql+pymysql://luisdotcom:***@localhost:3310/dev'
        },
        {
          id: 'postgres',
          name: 'PostgreSQL',
          icon: '🐘',
          connectionString: 'postgresql+psycopg2://luisdotcom:***@localhost:5433/dev'
        },
        {
          id: 'sqlserver',
          name: 'SQL Server',
          icon: '🗄️',
          connectionString: 'mssql+pyodbc://sa:***@localhost:1433/master'
        },
      ]
    },
    {
      groupName: 'Custom Connection',
      databases: [
        {
          id: 'custom',
          name: 'Custom',
          icon: '⚙️',
          connectionString: 'Custom connection string'
        },
      ]
    }
  ];

  const getSelectedDatabaseInfo = () => {
    for (const group of databaseGroups) {
      const db = group.databases.find(d => d.id === selectedDatabase);
      if (db) return db;
    }
    return null;
  };

  const handleTestConnection = async () => {
    if (!selectedDatabase || selectedDatabase === 'custom') {
      toast.warning('Please select a database to test');
      return;
    }

    setTesting(true);
    try {
      const result = await testConnection(selectedDatabase);
      setConnectionStatus(result.connected);

      if (result.connected) {
        toast.success(`Successfully connected to ${selectedDatabase.toUpperCase()}`);
      } else {
        toast.error(`Failed to connect to ${selectedDatabase.toUpperCase()}: ${result.message}`);
      }
    } catch (error) {
      setConnectionStatus(false);
      toast.error(`Connection error: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const selectedDbInfo = getSelectedDatabaseInfo();
  const connectionString = selectedDatabase === 'custom' && customConnection
    ? customConnection
    : selectedDbInfo?.connectionString || '';

  return (
    <div className={`database-selector ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="selector-header">
        <div className="selector-left">
          <h2 className="selector-title">
            <Database size={18} />
            Database
          </h2>
          <div className="database-options-inline">
            {databaseGroups.flatMap(group => group.databases).map((db) => (
              <button
                key={db.id}
                className={`database-option-inline ${selectedDatabase === db.id ? 'selected' : ''
                  }`}
                onClick={() => {
                  onDatabaseChange(db.id);
                  setConnectionStatus(null);
                  if (db.id === 'custom') {
                    setShowCustomForm(true);
                  } else {
                    setShowCustomForm(false);
                  }
                }}
              >
                <span className="db-icon-inline" title={db.name}>{db.icon}</span>
                <span className="db-name-inline">{db.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="selector-right">
          {selectedDatabase === 'custom' && (
            <button
              className="selector-collapse-button"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? <ChevronDown size={16} title="Expand" /> : <ChevronUp size={16} title="Collapse" />}
            </button>
          )}
          {selectedDbInfo && (
            <div className="info-button-container">
              <button className="info-button">
                <Info size={16} />
              </button>
              <div className="info-tooltip">
                {connectionString}
              </div>
            </div>
          )}
          <button
            className="test-button-main"
            onClick={handleTestConnection}
            disabled={testing || selectedDatabase === 'custom'}
          >
            {testing ? (
              <>
                <Loader size={16} className="spin" />
                <span>Test</span>
              </>
            ) : connectionStatus === true ? (
              <>
                <CheckCircle size={16} className="success-icon" />
                <span>Connected</span>
              </>
            ) : connectionStatus === false ? (
              <>
                <XCircle size={16} className="error-icon" />
                <span>Failed</span>
              </>
            ) : (
              <>
                <Zap size={16} />
                <span>Test</span>
              </>
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && showCustomForm && selectedDatabase === 'custom' && (
        <div className="custom-connection-form">
          <h3 className="form-title">
            <Settings size={18} />
            Custom Connection String
          </h3>
          <textarea
            className="connection-string-input"
            value={customConnection}
            onChange={(e) => onCustomConnectionChange(e.target.value)}
            placeholder="Enter SQLAlchemy connection string&#10;Example: postgresql://user:pass@host:port/database&#10;Or: mysql+pymysql://user:pass@host:port/database"
            rows={4}
          />
          <p className="form-hint">
            Enter a valid SQLAlchemy connection string. Supports any database with SQLAlchemy driver.
          </p>
        </div>
      )}
    </div>
  );
};

export default DatabaseSelector;
