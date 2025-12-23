
import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Database, ChevronDown, Check, Container, Plus, Trash2, X, Github, Play, AlertCircle, Loader2, LogOut, Edit2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo.png';
import { executeQuery, getDatabaseVersion } from '../services/databaseService';
import { getConnections, createConnection, updateConnection, deleteConnection } from '../services/connectionService';
import './Header.css';
import ConfirmationModal from './ConfirmationModal';

const Header = ({ selectedDatabase, onDatabaseChange, onCustomConnection }) => {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customConnections, setCustomConnections] = useState([]);
  const [newConnectionName, setNewConnectionName] = useState('');
  const [newConnectionString, setNewConnectionString] = useState('');

  const [inputMode, setInputMode] = useState('form');
  const [connDetails, setConnDetails] = useState({
    type: 'mysql',
    host: 'localhost',
    port: '3306',
    username: 'root',
    password: '',
    database: ''
  });

  const [saving, setSaving] = useState(false);
  const [testStatus, setTestStatus] = useState('idle');
  const [testMessage, setTestMessage] = useState('');
  const dropdownRef = useRef(null);


  const containerDatabases = [
    { id: 'mysql', name: 'MySQL', icon: '🐬' },
    { id: 'postgres', name: 'PostgreSQL', icon: '🐘' },
    { id: 'sqlserver', name: 'SQL Server', icon: '🗄️' },
  ];


  const [selectedConnectionId, setSelectedConnectionId] = useState(null);
  const [dbVersion, setDbVersion] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ show: false, connectionId: null });

  const loadConnections = async () => {
    try {
      const connections = await getConnections();
      setCustomConnections(connections);
    } catch (error) {
      console.error('Failed to load connections:', error);
    }
  };

  const [containerVersions, setContainerVersions] = useState({});

  useEffect(() => {
    loadConnections();

    const fetchContainerVersions = async () => {
      const versions = {};
      const types = ['mysql', 'postgres', 'sqlserver'];

      for (const type of types) {
        try {
          const v = await getDatabaseVersion(type);
          versions[type] = v.version;
        } catch {
          versions[type] = null;
        }
      }
      setContainerVersions(versions);
    };

    fetchContainerVersions();
  }, []);

  useEffect(() => {
    let currentV = null;
    const isCustom = ['mysql', 'postgres', 'sqlserver'].indexOf(selectedDatabase) === -1;

    if (!isCustom) {
      currentV = containerVersions[selectedDatabase];
    } else {
      const conn = customConnections.find(c => c.id === parseInt(selectedDatabase) || c.id === selectedDatabase);
      if (conn) {
        currentV = conn.version;
      }
    }
    setDbVersion(currentV);
  }, [selectedDatabase, customConnections, containerVersions]);


  const getSelectedDbInfo = () => {
    const containerDb = containerDatabases.find(db => db.id === selectedDatabase);
    if (containerDb) return containerDb;

    const customDb = customConnections.find(c => c.id === parseInt(selectedDatabase) || c.id === selectedDatabase);
    if (customDb) {
      let icon = '🔗';
      if (customDb.type === 'mysql') icon = '🐬';
      if (customDb.type === 'postgres') icon = '🐘';
      if (customDb.type === 'sqlserver') icon = '🗄️';
      return { id: customDb.id, name: customDb.name, icon: icon };
    }

    return containerDatabases[0];
  };

  const selectedDb = getSelectedDbInfo();


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectDatabase = (dbId, connectionString = null) => {
    onDatabaseChange(dbId, connectionString);
    setIsDropdownOpen(false);
  };

  const handleSelectCustomConnection = (connection) => {
    onDatabaseChange(connection.id, connection.connection_string);
    if (onCustomConnection) {
      onCustomConnection(connection.connection_string);
    }
    setIsDropdownOpen(false);
  };

  const handleAddCustomConnection = () => {
    setShowCustomModal(true);
    setIsDropdownOpen(false);
    setNewConnectionName('');
    setInputMode('form');
    setConnDetails({
      type: 'mysql',
      host: 'localhost',
      port: '3306',
      username: 'root',
      password: '',
      database: ''
    });

    setSelectedConnectionId(null);
    setNewConnectionName('');
    setInputMode('form');
    setConnDetails({
      type: 'mysql',
      host: 'localhost',
      port: '3306',
      username: 'root',
      password: '',
      database: ''
    });

    setTestStatus('idle');
    setTestMessage('');
  };

  const parseConnectionString = (str) => {
    try {
      const pattern = /^(?:([^:+]+)(?:\+([^:]+))?:\/\/)?([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]+)(?:\?.*)?$/;
      const match = str.match(pattern);

      if (match) {
        const [, type, driver, user, pass, host, port, db] = match;
        return {
          type: type || 'mysql',
          host: host || 'localhost',
          port: port || '3306',
          username: decodeURIComponent(user || ''),
          password: decodeURIComponent(pass || ''),
          database: db || ''
        };
      }
      return null;
    } catch (e) {
      console.warn("Could not parse connection string", e);
      return null;
    }
  };

  const handleEditConnection = (e, connection) => {
    e.stopPropagation();
    setSelectedConnectionId(connection.id);
    setNewConnectionName(connection.name);
    const connStr = connection.connection_string;
    setNewConnectionString(connStr);

    const parsed = parseConnectionString(connStr);
    if (parsed) {
      setConnDetails(parsed);
      setInputMode('form');
    } else {
      setInputMode('string');
      setConnDetails({
        type: 'mysql',
        host: 'localhost',
        port: '3306',
        username: 'root',
        password: '',
        database: ''
      });
    }

    setShowCustomModal(true);
    setTestStatus('idle');
    setTestMessage('');
  };

  useEffect(() => {
    if (inputMode === 'form' && showCustomModal) {
      const { type, host, port, username, password, database } = connDetails;

      let driver = 'pymysql';
      if (type === 'postgres') driver = 'psycopg2';
      if (type === 'sqlserver') driver = 'pyodbc';

      const encodedUser = encodeURIComponent(username);
      const encodedPass = encodeURIComponent(password);

      let str = '';
      if (type === 'sqlserver') {
        str = `mssql+${driver}://${encodedUser}:${encodedPass}@${host}:${port}/${database}?driver=ODBC+Driver+17+for+SQL+Server`;
      } else {
        str = `${type}+${driver}://${encodedUser}:${encodedPass}@${host}:${port}/${database}`;
      }

      setNewConnectionString(str);
      setTestStatus('idle');
      setTestMessage('');
    }
  }, [connDetails, inputMode, showCustomModal]);

  const handleConnDetailChange = (field, value) => {
    setConnDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveConnection = async () => {
    if (!newConnectionName.trim() || !newConnectionString.trim()) return;

    setSaving(true);
    try {
      let result;
      if (selectedConnectionId) {
        result = await updateConnection(selectedConnectionId, {
          name: newConnectionName.trim(),
          type: connDetails.type,
          connection_string: newConnectionString.trim()
        });
      } else {
        result = await createConnection({
          name: newConnectionName.trim(),
          type: connDetails.type,
          connection_string: newConnectionString.trim()
        });
      }

      await loadConnections();
      setShowCustomModal(false);
      setNewConnectionName('');
      setNewConnectionString('');
      setSaving(false);

      handleSelectCustomConnection(result);

    } catch (error) {
      setTestStatus('error');
      setTestMessage(`Failed to save: ${error.message || 'Unknown error'}`);
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!newConnectionString.trim()) return;

    setTestStatus('testing');
    setTestMessage('');

    try {
      await executeQuery('custom', 'SELECT 1', newConnectionString.trim());
      setTestStatus('success');
      setTestMessage('Connection successful!');
    } catch (error) {
      setTestStatus('error');
      setTestMessage(`Connection failed: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDeleteConnection = (e, connectionId) => {
    e.stopPropagation();
    setDeleteModal({ show: true, connectionId });
  };

  const confirmDeleteConnection = async () => {
    const { connectionId } = deleteModal;
    setDeleteModal({ show: false, connectionId: null });

    try {
      await deleteConnection(connectionId);
      await loadConnections();

      if (selectedDatabase === connectionId) {
        handleSelectDatabase('mysql');
      }
    } catch (error) {
      console.error("Failed to delete connection", error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-title">
          <img src={logo} alt="DB-Hub" className="header-logo" />
          <h1>DB-Hub</h1>
          <span className="header-sublabel">
            by{' '}
            <a
              href="https://luisdotcom.dev/"
              target="_blank"
              rel="noopener noreferrer"
            >
              luisdotcom
            </a>
          </span>
        </div>
        <div className="header-actions">
          <a
            href="https://github.com/luisdotcom/db-hub"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
            data-tooltip="View on GitHub"
            data-tooltip-pos="left"
          >
            <Github size={20} />
          </a>

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          <div className="db-dropdown" ref={dropdownRef}>
            <button
              className="db-dropdown-trigger"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span className="db-icon">{selectedDb.icon}</span>
              <div className="db-info">
                <span className="db-name">{selectedDb.name}</span>
              </div>
              <ChevronDown size={16} className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="db-dropdown-menu">
                <div className="dropdown-group">
                  <div className="dropdown-group-header">
                    <Container size={14} />
                    <span>Container</span>
                  </div>
                  {containerDatabases.map((db) => (
                    <button
                      key={db.id}
                      className={`db-dropdown-item ${selectedDatabase === db.id ? 'selected' : ''}`}
                      onClick={() => handleSelectDatabase(db.id)}
                    >
                      <span className="db-icon">{db.icon}</span>
                      <div className="db-info">
                        <span className="db-name">{db.name}</span>
                        {containerVersions[db.id] && (
                          <span className="db-version" style={{ color: 'rgba(255,255,255,0.8)' }}>v{containerVersions[db.id]}</span>
                        )}
                      </div>
                      {selectedDatabase === db.id && <Check size={16} className="check-icon" />}
                    </button>
                  ))}
                </div>

                <div className="dropdown-group">
                  <div className="dropdown-group-header">
                    <Database size={14} />
                    <span>Custom</span>
                  </div>

                  {customConnections.length > 0 && (
                    <>
                      {customConnections.map((conn) => {
                        let icon = '🔗';
                        if (conn.type === 'mysql') icon = '🐬';
                        if (conn.type === 'postgres') icon = '🐘';
                        if (conn.type === 'sqlserver') icon = '🗄️';

                        return (
                          <button
                            key={conn.id}
                            className={`db-dropdown-item ${selectedDatabase === conn.id ? 'selected' : ''}`}
                            onClick={() => handleSelectCustomConnection(conn)}
                          >
                            <span className="db-icon">{icon}</span>
                            <div className="db-info">
                              <span className="db-name">{conn.name}</span>
                              {conn.version && (
                                <span className="db-version" style={{ color: selectedDatabase === conn.id ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>v{conn.version}</span>
                              )}
                            </div>
                            <div className="item-actions">
                              {selectedDatabase === conn.id && <Check size={16} className="check-icon" />}
                              <button
                                className="edit-btn"
                                onClick={(e) => handleEditConnection(e, conn)}
                                data-tooltip="Edit connection"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                className="delete-btn"
                                onClick={(e) => handleDeleteConnection(e, conn.id)}
                                data-tooltip="Delete connection"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </button>
                        );
                      })}
                    </>
                  )}

                  <button
                    className="db-dropdown-item add-custom"
                    onClick={handleAddCustomConnection}
                  >
                    <Plus size={16} />
                    <span className="db-name">Add Connection...</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            className="theme-toggle"
            onClick={handleLogout}
            aria-label="Logout"
            data-tooltip="Logout"
            data-tooltip-pos="left"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {showCustomModal && (
        <div className="modal-overlay">
          <div className="modal-content custom-connection-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>{selectedConnectionId ? 'Edit Connection' : 'Add Custom Connection'}</h4>
              <button className="modal-close" onClick={() => setShowCustomModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="connName">Connection Name</label>
                <input
                  id="connName"
                  type="text"
                  value={newConnectionName}
                  onChange={(e) => setNewConnectionName(e.target.value)}
                  placeholder="My Database"
                  autoFocus
                />
              </div>
              <div className="connection-mode-tabs">
                <button
                  className={`tab-btn ${inputMode === 'form' ? 'active' : ''}`}
                  onClick={() => setInputMode('form')}
                >
                  Connection Builder
                </button>
                <button
                  className={`tab-btn ${inputMode === 'string' ? 'active' : ''}`}
                  onClick={() => setInputMode('string')}
                >
                  Raw String
                </button>
              </div>

              {inputMode === 'form' && (
                <div className="builder-form">
                  <div className="form-row">
                    <div className="form-group half">
                      <label>Database Type</label>
                      <select
                        value={connDetails.type}
                        onChange={(e) => handleConnDetailChange('type', e.target.value)}
                      >
                        <option value="mysql">MySQL</option>
                        <option value="postgres">PostgreSQL</option>
                        <option value="sqlserver">SQL Server</option>
                      </select>
                    </div>
                    <div className="form-group half">
                      <label>Database Name</label>
                      <input
                        type="text"
                        value={connDetails.database}
                        onChange={(e) => handleConnDetailChange('database', e.target.value)}
                        placeholder="master"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group half">
                      <label>Host</label>
                      <input
                        type="text"
                        value={connDetails.host}
                        onChange={(e) => handleConnDetailChange('host', e.target.value)}
                        placeholder="localhost"
                      />
                      <div className="field-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Use <strong>host.docker.internal</strong> to access your local machine.
                      </div>
                    </div>
                    <div className="form-group half">
                      <label>Port</label>
                      <input
                        type="text"
                        value={connDetails.port}
                        onChange={(e) => handleConnDetailChange('port', e.target.value)}
                        placeholder="3306"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group half">
                      <label>Username</label>
                      <input
                        type="text"
                        value={connDetails.username}
                        onChange={(e) => handleConnDetailChange('username', e.target.value)}
                        placeholder="root"
                      />
                    </div>
                    <div className="form-group half">
                      <label>Password</label>
                      <input
                        type="password"
                        value={connDetails.password}
                        onChange={(e) => handleConnDetailChange('password', e.target.value)}
                        placeholder="********"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="connString">Connection String {inputMode === 'form' && '(Auto-generated)'}</label>
                <div className="input-with-button">
                  <input
                    id="connString"
                    type="text"
                    value={newConnectionString}
                    onChange={(e) => {
                      setNewConnectionString(e.target.value);
                      if (inputMode === 'form') setInputMode('string');
                      if (testStatus !== 'idle') {
                        setTestStatus('idle');
                        setTestMessage('');
                      }
                    }}
                    placeholder="mysql+pymysql://user:password@host:port/database"
                  />
                  <button
                    className={`test-conn-btn ${testStatus}`}
                    onClick={handleTestConnection}
                    disabled={!newConnectionString.trim() || testStatus === 'testing'}
                    data-tooltip="Test Connection"
                  >
                    {testStatus === 'testing' ? (
                      <Loader2 size={16} className="spin" />
                    ) : testStatus === 'success' ? (
                      <Check size={16} />
                    ) : testStatus === 'error' ? (
                      <AlertCircle size={16} />
                    ) : (
                      <Play size={16} />
                    )}
                  </button>
                </div>
                {testMessage && (
                  <div className={`test-message ${testStatus}`}>
                    {testMessage}
                  </div>
                )}
                <div className="form-hint">
                  <strong>Examples:</strong>
                  <ul>
                    <li><code>mysql+pymysql://user:pass@localhost:3306/mydb</code></li>
                    <li><code>postgresql+psycopg2://user:pass@localhost:5432/mydb</code></li>
                    <li><code>mssql+pyodbc://user:pass@localhost:1433/mydb?driver=ODBC+Driver+17</code></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="modal-btn cancel"
                onClick={() => setShowCustomModal(false)}
              >
                Cancel
              </button>
              <button
                className="modal-btn create"
                onClick={handleSaveConnection}
                disabled={saving || !newConnectionName.trim() || !newConnectionString.trim()}
              >
                {saving ? 'Saving...' : 'Save Connection'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteModal.show}
        onClose={() => setDeleteModal({ show: false, connectionId: null })}
        onConfirm={confirmDeleteConnection}
        title="Delete Connection"
        message="Are you sure you want to delete this connection? This action cannot be undone."
        confirmText="Delete"
        isDangerous={true}
      />
    </header>
  );
};

export default Header;
