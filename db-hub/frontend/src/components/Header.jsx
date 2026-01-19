/**
 * Header Component
 * Displays app title, database selector dropdown, and theme toggle
 * Clean, minimalist design
 */
import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Database, ChevronDown, Check, Container, Plus, Trash2, X, Github } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import logo from '../assets/logo.png';
import './Header.css';

const STORAGE_KEY = 'DBHub_custom_connections';

const Header = ({ selectedDatabase, onDatabaseChange, onCustomConnection }) => {
  const { theme, toggleTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customConnections, setCustomConnections] = useState([]);
  const [newConnectionName, setNewConnectionName] = useState('');
  const [newConnectionString, setNewConnectionString] = useState('');
  const [saving, setSaving] = useState(false);
  const dropdownRef = useRef(null);

  // Container databases (Docker)
  const containerDatabases = [
    { id: 'mysql', name: 'MySQL', icon: '🐬' },
    { id: 'postgres', name: 'PostgreSQL', icon: '🐘' },
    { id: 'sqlserver', name: 'SQL Server', icon: '🗄️' },
  ];

  // Load custom connections from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setCustomConnections(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved connections:', e);
      }
    }
  }, []);

  // Save custom connections to localStorage
  const saveConnections = (connections) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
    setCustomConnections(connections);
  };

  // Find selected database info
  const getSelectedDbInfo = () => {
    const containerDb = containerDatabases.find(db => db.id === selectedDatabase);
    if (containerDb) return containerDb;
    
    const customDb = customConnections.find(c => c.id === selectedDatabase);
    if (customDb) return { id: customDb.id, name: customDb.name, icon: '🔗' };
    
    return containerDatabases[0];
  };

  const selectedDb = getSelectedDbInfo();

  // Close dropdown when clicking outside
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
    onDatabaseChange(connection.id, connection.connectionString);
    if (onCustomConnection) {
      onCustomConnection(connection.connectionString);
    }
    setIsDropdownOpen(false);
  };

  const handleAddCustomConnection = () => {
    setShowCustomModal(true);
    setIsDropdownOpen(false);
    setNewConnectionName('');
    setNewConnectionString('mysql+pymysql://user:password@localhost:3306/database');
  };

  const handleSaveConnection = () => {
    if (!newConnectionName.trim() || !newConnectionString.trim()) return;

    setSaving(true);
    const newConnection = {
      id: `custom_${Date.now()}`,
      name: newConnectionName.trim(),
      connectionString: newConnectionString.trim(),
      createdAt: new Date().toISOString()
    };

    const updated = [...customConnections, newConnection];
    saveConnections(updated);
    
    setShowCustomModal(false);
    setNewConnectionName('');
    setNewConnectionString('');
    setSaving(false);

    // Automatically select the new connection
    handleSelectCustomConnection(newConnection);
  };

  const handleDeleteConnection = (e, connectionId) => {
    e.stopPropagation();
    const updated = customConnections.filter(c => c.id !== connectionId);
    saveConnections(updated);
    
    // If the deleted connection was selected, switch to mysql
    if (selectedDatabase === connectionId) {
      handleSelectDatabase('mysql');
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-title">
          <img src={logo} alt="DB-Hub" className="header-logo" />
          <h1>DB-Hub</h1>
          <span className="header-sublabel">
            developed by{' '}
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
            title="View on GitHub"
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
              <span className="db-name">{selectedDb.name}</span>
              <ChevronDown size={16} className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`} />
            </button>
            
            {isDropdownOpen && (
              <div className="db-dropdown-menu">
                {/* Container Group */}
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
                      <span className="db-name">{db.name}</span>
                      {selectedDatabase === db.id && <Check size={16} className="check-icon" />}
                    </button>
                  ))}
                </div>

                {/* Custom Connections Group */}
                <div className="dropdown-group">
                  <div className="dropdown-group-header">
                    <Database size={14} />
                    <span>Custom</span>
                  </div>
                  
                  {customConnections.length > 0 && (
                    <>
                      {customConnections.map((conn) => (
                        <button
                          key={conn.id}
                          className={`db-dropdown-item ${selectedDatabase === conn.id ? 'selected' : ''}`}
                          onClick={() => handleSelectCustomConnection(conn)}
                        >
                          <span className="db-icon">🔗</span>
                          <span className="db-name">{conn.name}</span>
                          <div className="item-actions">
                            {selectedDatabase === conn.id && <Check size={16} className="check-icon" />}
                            <button 
                              className="delete-btn"
                              onClick={(e) => handleDeleteConnection(e, conn.id)}
                              title="Delete connection"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </button>
                      ))}
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
        </div>
      </div>

      {/* Custom Connection Modal */}
      {showCustomModal && (
        <div className="modal-overlay" onClick={() => setShowCustomModal(false)}>
          <div className="modal-content custom-connection-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Add Custom Connection</h4>
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
              <div className="form-group">
                <label htmlFor="connString">Connection String</label>
                <input
                  id="connString"
                  type="text"
                  value={newConnectionString}
                  onChange={(e) => setNewConnectionString(e.target.value)}
                  placeholder="mysql+pymysql://user:password@host:port/database"
                />
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
    </header>
  );
};

export default Header;
