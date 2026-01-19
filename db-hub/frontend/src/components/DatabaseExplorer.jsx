/**
 * DatabaseExplorer Component
 * Left panel for managing database objects
 */
import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, ChevronUp, Table, Eye, Zap, Code, Database, RefreshCw, List, Hash, Info, Play, Plus, FolderOpen } from 'lucide-react';
import { getTables, getViews, getProcedures, getFunctions, getTriggers, getDatabases, createDatabase, selectDatabase } from '../services/databaseService';
import { useToast } from '../contexts/ToastContext';
import './DatabaseExplorer.css';

const DatabaseExplorer = ({ selectedDatabase, databaseName, onObjectSelect, onLoadQuery, onDatabaseSelected }) => {
  const [databases, setDatabases] = useState([]);
  const [currentDatabase, setCurrentDatabase] = useState(null);
  const [objects, setObjects] = useState({
    tables: [],
    views: [],
    procedures: [],
    functions: [],
    triggers: []
  });
  const [expanded, setExpanded] = useState({
    databases: true,
    tables: true,
    views: false,
    procedures: false,
    functions: false,
    triggers: false
  });
  const [loading, setLoading] = useState(false);
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDbName, setNewDbName] = useState('');
  const [creating, setCreating] = useState(false);
  const toast = useToast();

  const loadDatabaseList = async () => {
    if (!selectedDatabase || selectedDatabase === 'custom') {
      setDatabases([]);
      return;
    }

    setLoadingDatabases(true);
    try {
      const dbList = await getDatabases(selectedDatabase);
      setDatabases(dbList || []);
    } catch (error) {
      toast.error(`Failed to load databases: ${error.message}`);
      setDatabases([]);
    } finally {
      setLoadingDatabases(false);
    }
  };

  const loadDatabaseObjects = async () => {
    if (!selectedDatabase || selectedDatabase === 'custom' || !currentDatabase) {
      setObjects({
        tables: [],
        views: [],
        procedures: [],
        functions: [],
        triggers: []
      });
      return;
    }

    setLoading(true);
    try {
      const [tables, views, procedures, functions, triggers] = await Promise.all([
        getTables(selectedDatabase),
        getViews(selectedDatabase),
        getProcedures(selectedDatabase),
        getFunctions(selectedDatabase),
        getTriggers(selectedDatabase)
      ]);

      setObjects({
        tables: tables || [],
        views: views || [],
        procedures: procedures || [],
        functions: functions || [],
        triggers: triggers || []
      });
    } catch (error) {
      toast.error(`Failed to load database objects: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentDatabase(null);
    setObjects({
      tables: [],
      views: [],
      procedures: [],
      functions: [],
      triggers: []
    });
    loadDatabaseList();
  }, [selectedDatabase]);

  useEffect(() => {
    if (currentDatabase) {
      loadDatabaseObjects();
    }
  }, [currentDatabase]);

  const handleSelectDatabase = async (dbName) => {
    try {
      await selectDatabase(selectedDatabase, dbName);
      setCurrentDatabase(dbName);
      if (onDatabaseSelected) {
        onDatabaseSelected(dbName);
      }
      toast.success(`Switched to database '${dbName}'`);
    } catch (error) {
      toast.error(`Failed to select database: ${error.message}`);
    }
  };

  const handleCreateDatabase = async () => {
    if (!newDbName.trim()) {
      toast.warning('Please enter a database name');
      return;
    }

    setCreating(true);
    try {
      await createDatabase(selectedDatabase, newDbName.trim());
      toast.success(`Database '${newDbName}' created successfully`);
      setNewDbName('');
      setShowCreateModal(false);
      loadDatabaseList();
    } catch (error) {
      toast.error(`Failed to create database: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const toggleSection = (section) => {
    setExpanded(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleObjectClick = (type, name) => {
    if (onObjectSelect) {
      onObjectSelect(type, name);
    }
  };

  const generateSQL = (action, objectType, objectName) => {
    const dbType = selectedDatabase === 'sqlserver' ? 'sqlserver' : 
                   selectedDatabase === 'postgres' ? 'postgres' : 'mysql';

    // Generate SQL based on action and database type
    switch (action) {
      case 'select100':
        if (dbType === 'sqlserver') {
          return `SELECT TOP 100 * FROM ${objectType === 'views' ? '' : ''}${objectName};`;
        } else if (dbType === 'postgres') {
          return `SELECT * FROM ${objectName} LIMIT 100;`;
        } else {
          return `SELECT * FROM ${objectName} LIMIT 100;`;
        }
      
      case 'count':
        return `SELECT COUNT(*) AS total_rows FROM ${objectName};`;
      
      case 'describe':
        if (dbType === 'sqlserver') {
          return `EXEC sp_help '${objectName}';`;
        } else if (dbType === 'postgres') {
          return `\\d+ ${objectName}`;
        } else {
          return `DESCRIBE ${objectName};`;
        }
      
      case 'selectAll':
        return `SELECT * FROM ${objectName};`;
      
      case 'showCreate':
        if (objectType === 'views') {
          if (dbType === 'sqlserver') {
            return `SELECT OBJECT_DEFINITION(OBJECT_ID('${objectName}')) AS ViewDefinition;`;
          } else if (dbType === 'postgres') {
            return `SELECT pg_get_viewdef('${objectName}', true);`;
          } else {
            return `SHOW CREATE VIEW ${objectName};`;
          }
        } else if (objectType === 'procedures') {
          if (dbType === 'sqlserver') {
            return `EXEC sp_helptext '${objectName}';`;
          } else if (dbType === 'postgres') {
            return `SELECT pg_get_functiondef((SELECT oid FROM pg_proc WHERE proname = '${objectName}' LIMIT 1));`;
          } else {
            return `SHOW CREATE PROCEDURE ${objectName};`;
          }
        } else if (objectType === 'functions') {
          if (dbType === 'sqlserver') {
            return `EXEC sp_helptext '${objectName}';`;
          } else if (dbType === 'postgres') {
            return `SELECT pg_get_functiondef((SELECT oid FROM pg_proc WHERE proname = '${objectName}' LIMIT 1));`;
          } else {
            return `SHOW CREATE FUNCTION ${objectName};`;
          }
        } else if (objectType === 'triggers') {
          if (dbType === 'sqlserver') {
            return `EXEC sp_helptext '${objectName}';`;
          } else if (dbType === 'postgres') {
            return `SELECT pg_get_triggerdef((SELECT oid FROM pg_trigger WHERE tgname = '${objectName}' LIMIT 1));`;
          } else {
            return `SHOW CREATE TRIGGER ${objectName};`;
          }
        }
        break;
      
      case 'execute':
        if (objectType === 'procedures') {
          if (dbType === 'sqlserver') {
            return `EXEC ${objectName};`;
          } else if (dbType === 'postgres') {
            return `CALL ${objectName}();`;
          } else {
            return `CALL ${objectName}();`;
          }
        } else if (objectType === 'functions') {
          if (dbType === 'sqlserver') {
            return `SELECT dbo.${objectName}();`;
          } else if (dbType === 'postgres') {
            return `SELECT ${objectName}();`;
          } else {
            return `SELECT ${objectName}();`;
          }
        }
        break;
      
      default:
        return '';
    }
  };

  const handleQuickAction = (e, action, objectType, objectName) => {
    e.stopPropagation();
    const sql = generateSQL(action, objectType, objectName);
    if (sql && onLoadQuery) {
      onLoadQuery(sql);
    }
  };

  const sections = [
    { id: 'tables', label: 'Tables', icon: Table, items: objects.tables },
    { id: 'views', label: 'Views', icon: Eye, items: objects.views },
    { id: 'procedures', label: 'Procedures', icon: Zap, items: objects.procedures },
    { id: 'functions', label: 'Functions', icon: Code, items: objects.functions },
    { id: 'triggers', label: 'Triggers', icon: Zap, items: objects.triggers }
  ];

  const handleRefresh = () => {
    loadDatabaseList();
    if (currentDatabase) {
      loadDatabaseObjects();
    }
  };

  return (
    <div className={`database-explorer ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="explorer-header">
        <h3>
          <Database size={18} />
          Explorer
        </h3>
        <div className="header-actions">
          <button 
            className="collapse-button" 
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronDown size={16} title="Expand" /> : <ChevronUp size={16} title="Collapse" />}
          </button>
          <button 
            className="refresh-button" 
            onClick={handleRefresh}
            disabled={loading || loadingDatabases}
          >
            <RefreshCw size={16} className={(loading || loadingDatabases) ? 'spin' : ''} title="Refresh" />
          </button>
        </div>
      </div>

      {!selectedDatabase || selectedDatabase === 'custom' ? (
        <div className="empty-state">
          <p>Select a database type to explore</p>
        </div>
      ) : (
        <div className="explorer-content">
          {/* Database List Section */}
          <div className="explorer-section">
            <div className="section-header-wrapper">
              <div 
                className="section-header"
                onClick={() => toggleSection('databases')}
              >
                {expanded.databases ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <FolderOpen size={16} />
                <span className="section-label">Databases</span>
                <span className="section-count">{databases.length}</span>
              </div>
              <button 
                className="section-action-btn"
                onClick={() => setShowCreateModal(true)}
                title="Create new database"
              >
                <Plus size={14} />
              </button>
            </div>
            
            {expanded.databases && (
              <div className="section-content">
                {loadingDatabases ? (
                  <div className="loading-section">Loading databases...</div>
                ) : databases.length === 0 ? (
                  <div className="empty-section">No databases found</div>
                ) : (
                  <ul className="object-list">
                    {databases.map((db, index) => (
                      <li 
                        key={index} 
                        className={`object-item database-item ${currentDatabase === db ? 'selected' : ''}`}
                        onClick={() => handleSelectDatabase(db)}
                      >
                        <Database size={14} className="db-icon" />
                        <span className="item-name" title={db}>{db}</span>
                        {currentDatabase === db && <span className="selected-badge">active</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Show object sections only when a database is selected */}
          {currentDatabase && (
            <>
              <div className="current-db-indicator">
                <Database size={12} />
                <span>{currentDatabase}</span>
              </div>
              
              {sections.map(section => {
                const Icon = section.icon;
                const isExpanded = expanded[section.id];
                const items = section.items;
            
            return (
              <div key={section.id} className="explorer-section">
                <div 
                  className="section-header"
                  onClick={() => toggleSection(section.id)}
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <Icon size={16} />
                  <span className="section-label">{section.label}</span>
                  <span className="section-count">{items.length}</span>
                </div>
                
                {isExpanded && (
                  <div className="section-content">
                    {items.length === 0 ? (
                      <div className="empty-section">No {section.label.toLowerCase()}</div>
                    ) : (
                      <ul className="object-list">
                        {items.map((item, index) => {
                          const itemName = typeof item === 'string' ? item : item.name;
                          return (
                            <li 
                              key={index} 
                              className="object-item"
                              onClick={() => handleObjectClick(section.id, itemName)}
                            >
                              <span className="item-name" title={itemName}>
                                {itemName}
                                {item.table && <span className="item-meta">on {item.table}</span>}
                              </span>
                              <div className="item-actions">
                                {(section.id === 'tables' || section.id === 'views') && (
                                  <>
                                    <button 
                                      className="action-btn"
                                      onClick={(e) => handleQuickAction(e, 'select100', section.id, itemName)}
                                    >
                                      <List size={12} title="SELECT TOP 100" />
                                    </button>
                                    {section.id === 'tables' && (
                                      <>
                                        <button 
                                          className="action-btn"
                                          onClick={(e) => handleQuickAction(e, 'count', section.id, itemName)}
                                        >
                                          <Hash size={12} title="COUNT rows" />
                                        </button>
                                        <button 
                                          className="action-btn"
                                          onClick={(e) => handleQuickAction(e, 'describe', section.id, itemName)}
                                        >
                                          <Info size={12} title="DESCRIBE table" />
                                        </button>
                                      </>
                                    )}
                                  </>
                                )}
                                {(section.id === 'procedures' || section.id === 'functions') && (
                                  <>
                                    <button 
                                      className="action-btn"
                                      onClick={(e) => handleQuickAction(e, 'showCreate', section.id, itemName)}
                                  >
                                      <Info size={12} title="Show definition" />
                                  </button>
                                  <button
                                      className="action-btn"
                                      onClick={(e) => handleQuickAction(e, 'execute', section.id, itemName)}
                                  >
                                      <Play size={12} title="Execute template" />
                                    </button>
                                  </>
                                )}
                                {section.id === 'triggers' && (
                                  <button 
                                    className="action-btn"
                                    onClick={(e) => handleQuickAction(e, 'showCreate', section.id, itemName)}
                                  >
                                    <Info size={12} title="Show definition" />
                                  </button>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
            </>
          )}
        </div>
      )}

      {/* Create Database Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Create New Database</h4>
            <div className="modal-body">
              <label htmlFor="dbName">Database Name</label>
              <input
                id="dbName"
                type="text"
                value={newDbName}
                onChange={(e) => setNewDbName(e.target.value)}
                placeholder="Enter database name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateDatabase();
                  if (e.key === 'Escape') setShowCreateModal(false);
                }}
              />
            </div>
            <div className="modal-actions">
              <button 
                className="modal-btn cancel"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button 
                className="modal-btn create"
                onClick={handleCreateDatabase}
                disabled={creating || !newDbName.trim()}
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseExplorer;
