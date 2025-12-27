
import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, ChevronUp, Table, Eye, Zap, Code, Database, RefreshCw, List, Hash, Info, Play, Plus, FolderOpen, X, Link, Trash2, Key, GitMerge, FileText, Search } from 'lucide-react';
import { getTables, getViews, getProcedures, getFunctions, getTriggers, getDatabases, createDatabase, selectDatabase, exportDatabase, getConnectionStringForDb, deleteDatabase, getPrimaryKeys, getForeignKeys, getIndexes, getTableSchema } from '../services/databaseService';
import { useToast } from '../contexts/ToastContext';
import apiClient from '../config/api';
import './DatabaseExplorer.css';
import ConfirmationModal from './ConfirmationModal';
import ExportModal from './ExportModal';



const DatabaseExplorer = ({ selectedDatabase, customConnection, databaseName, onObjectSelect, onLoadQuery, onDatabaseSelected }) => {
  const [databases, setDatabases] = useState([]);
  const [currentDatabase, setCurrentDatabase] = useState(null);
  const [objects, setObjects] = useState({
    tables: [],
    views: [],
    procedures: [],
    functions: [],
    triggers: []
  });
  const [tableDetails, setTableDetails] = useState({});
  const [expandedTables, setExpandedTables] = useState({});
  const [expanded, setExpanded] = useState({
    databases: true,
    tables: true,
    views: false,
    procedures: false,
    functions: false,
    triggers: false
  });
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDbName, setNewDbName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [exporting, setExporting] = useState(null);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ show: false, dbName: null });
  const [exportModal, setExportModal] = useState({ show: false, dbName: null });
  const toast = useToast();

  const loadDatabaseList = async () => {
    if (!selectedDatabase || selectedDatabase === 'custom') {
      setDatabases([]);
      return;
    }

    setLoadingDatabases(true);
    try {
      const dbStr = String(selectedDatabase);
      const isCustom = (typeof dbStr === 'string' && dbStr.startsWith('custom')) ||
        typeof dbStr === 'number' ||
        (!['mysql', 'postgres', 'sqlserver'].includes(dbStr));

      if (typeof dbStr === 'string' && dbStr.startsWith('sqlite')) {
        setDatabases(['main']);
        setLoadingDatabases(false);
        return;
      }

      const connStr = isCustom ? customConnection : null;

      if (isCustom && !connStr) {
        setDatabases([]);
        setLoadingDatabases(false);
        return;
      }

      const dbList = await getDatabases(selectedDatabase, connStr);
      setDatabases(dbList || []);
    } catch (error) {
      toast.error(`Failed to load databases: ${error.message} `);
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
      const dbStr = String(selectedDatabase);
      const isCustom = (typeof dbStr === 'string' && dbStr.startsWith('custom')) ||
        typeof dbStr === 'number' ||
        (!['mysql', 'postgres', 'sqlserver'].includes(dbStr));

      let connStr = isCustom ? customConnection : null;
      if (typeof selectedDatabase === 'string' && selectedDatabase.startsWith('sqlite')) {
        connStr = selectedDatabase;
      } else if (isCustom && currentDatabase) {
        connStr = getConnectionStringForDb(customConnection, currentDatabase);
      }

      const [tables, views, procedures, functions, triggers] = await Promise.all([
        getTables(selectedDatabase, connStr),
        getViews(selectedDatabase, connStr),
        getProcedures(selectedDatabase, connStr),
        getFunctions(selectedDatabase, connStr),
        getTriggers(selectedDatabase, connStr)
      ]);

      setObjects({
        tables: tables || [],
        views: views || [],
        procedures: procedures || [],
        functions: functions || [],
        triggers: triggers || []
      });
    } catch (error) {
      toast.error(`Failed to load database objects: ${error.message} `);
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
    setFilters({});
    loadDatabaseList();
  }, [selectedDatabase, customConnection]);

  useEffect(() => {
    if (currentDatabase) {
      loadDatabaseObjects();
    }
  }, [currentDatabase]);

  const handleSelectDatabase = async (dbName) => {
    try {
      const dbStr = String(selectedDatabase);
      const isCustom = (typeof dbStr === 'string' && dbStr.startsWith('custom')) ||
        typeof dbStr === 'number' ||
        (!['mysql', 'postgres', 'sqlserver'].includes(dbStr));
      const connStr = isCustom ? customConnection : null;

      await selectDatabase(selectedDatabase, dbName, connStr);
      setCurrentDatabase(dbName);
      if (onDatabaseSelected) {
        onDatabaseSelected(dbName);
      }
      toast.success(`Switched to database '${dbName}'`);
    } catch (error) {
      toast.error(`Failed to select database: ${error.message} `);
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
      toast.error(`Failed to create database: ${error.message} `);
    } finally {
      setCreating(false);
    }
  };

  const handleExportDatabase = async (e, dbName) => {
    e.stopPropagation();

    if (String(selectedDatabase).startsWith('sqlite')) {
      const parts = String(selectedDatabase).split('/');
      const filename = parts[parts.length - 1];

      toast.info(`Downloading ${filename}...`);
      setExporting(dbName);

      try {
        const response = await apiClient.get(`/api/files/download/${filename}`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success(`Downloaded ${filename}`);
      } catch (error) {
        console.error('Download error:', error);
        toast.error('Download failed');
      } finally {
        setExporting(null);
      }
      return;
    }

    setExportModal({ show: true, dbName });
  };

  const handleConfirmExport = async (options) => {
    const dbName = exportModal.dbName;
    setExportModal({ show: false, dbName: null });

    try {
      setExporting(dbName);
      toast.info(`Exporting ${dbName}...`);

      const dbStr = String(selectedDatabase);
      const isCustom = (typeof dbStr === 'string' && dbStr.startsWith('custom')) ||
        typeof dbStr === 'number' ||
        (!['mysql', 'postgres', 'sqlserver'].includes(dbStr));
      const connStr = isCustom ? customConnection : null;

      await exportDatabase(selectedDatabase, dbName, options, connStr);
      toast.success(`Export started for ${dbName}`);
    } catch (error) {
      toast.error(`Export failed: ${error.message} `);
    } finally {
      setExporting(null);
    }
  };

  const initiateDelete = (e, dbName) => {
    e.stopPropagation();
    setDeleteModal({ show: true, dbName });
  };

  const confirmDelete = async () => {
    const dbName = deleteModal.dbName;
    setDeleteModal({ show: false, dbName: null });

    setDeleting(dbName);
    try {
      const dbStr = String(selectedDatabase);
      const isCustom = (typeof dbStr === 'string' && dbStr.startsWith('custom')) ||
        typeof dbStr === 'number' ||
        (!['mysql', 'postgres', 'sqlserver'].includes(dbStr));
      const dbType = isCustom ? 'custom' : selectedDatabase;
      const connStr = isCustom ? customConnection : null;

      await deleteDatabase(dbType, dbName, connStr);
      toast.success(`Database '${dbName}' deleted successfully`);
      if (currentDatabase === dbName) {
        setCurrentDatabase(null);
        if (onDatabaseSelected) onDatabaseSelected(null);
      }
      loadDatabaseList();
    } catch (error) {
      toast.error(`Failed to delete database: ${error.message} `);
    } finally {
      setDeleting(null);
    }
  };

  const toggleSection = (section) => {
    setExpanded(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleTableExpansion = async (tableName) => {
    setExpandedTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }));

    if (!tableDetails[tableName] && !expandedTables[tableName]) {
      try {
        const dbStr = String(selectedDatabase);
        const isCustom = (typeof dbStr === 'string' && dbStr.startsWith('custom')) ||
          typeof dbStr === 'number' ||
          (!['mysql', 'postgres', 'sqlserver'].includes(dbStr));
        const dbType = isCustom ? 'custom' : selectedDatabase;
        let connStr = isCustom ? customConnection : null;
        if (isCustom && currentDatabase) {
          connStr = getConnectionStringForDb(customConnection, currentDatabase);
        }

        const [columnsData, fksData, indexesData, pksData] = await Promise.all([
          getTableSchema(dbType, tableName, connStr),
          getForeignKeys(dbType, tableName, connStr),
          getIndexes(dbType, tableName, connStr),
          getPrimaryKeys(dbType, tableName, connStr)
        ]);

        const fks = fksData || [];
        const indexes = indexesData || [];
        const columns = columnsData.columns || [];
        const pks = pksData || [];

        setTableDetails(prev => ({
          ...prev,
          [tableName]: {
            columns: columns.map(col => ({
              ...col,
              isPk: pks.includes(col.name),
              isFk: fks.some(fk => fk.constrained_columns.includes(col.name))
            })),
            foreignKeys: fks,
            indexes: indexes
          }
        }));
      } catch (error) {
        console.error("Failed to load table details", error);
        toast.error(`Failed to load details for ${tableName}`);
      }
    }
  };

  const handleFilterChange = (sectionId, value) => {
    setFilters(prev => ({
      ...prev,
      [sectionId]: value
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


    switch (action) {
      case 'select100':
        if (dbType === 'sqlserver') {
          return `SELECT TOP 100 * FROM ${objectType === 'views' ? '' : ''}${objectName}; `;
        } else if (dbType === 'postgres') {
          return `SELECT * FROM ${objectName} LIMIT 100; `;
        } else {
          return `SELECT * FROM ${objectName} LIMIT 100; `;
        }

      case 'count':
        return `SELECT COUNT(*) AS total_rows FROM ${objectName}; `;

      case 'describe':
        if (dbType === 'sqlserver') {
          return `EXEC sp_help '${objectName}'; `;
        } else if (dbType === 'postgres') {
          return `\\d + ${objectName} `;
        } else {
          return `DESCRIBE ${objectName}; `;
        }

      case 'selectAll':
        return `SELECT * FROM ${objectName}; `;

      case 'showCreate':
        if (objectType === 'views') {
          if (dbType === 'sqlserver') {
            return `SELECT OBJECT_DEFINITION(OBJECT_ID('${objectName}')) AS ViewDefinition; `;
          } else if (dbType === 'postgres') {
            return `SELECT pg_get_viewdef('${objectName}', true); `;
          } else {
            return `SHOW CREATE VIEW ${objectName}; `;
          }
        } else if (objectType === 'procedures') {
          if (dbType === 'sqlserver') {
            return `EXEC sp_helptext '${objectName}'; `;
          } else if (dbType === 'postgres') {
            return `SELECT pg_get_functiondef((SELECT oid FROM pg_proc WHERE proname = '${objectName}' LIMIT 1)); `;
          } else {
            return `SHOW CREATE PROCEDURE ${objectName}; `;
          }
        } else if (objectType === 'functions') {
          if (dbType === 'sqlserver') {
            return `EXEC sp_helptext '${objectName}'; `;
          } else if (dbType === 'postgres') {
            return `SELECT pg_get_functiondef((SELECT oid FROM pg_proc WHERE proname = '${objectName}' LIMIT 1)); `;
          } else {
            return `SHOW CREATE FUNCTION ${objectName}; `;
          }
        } else if (objectType === 'triggers') {
          if (dbType === 'sqlserver') {
            return `EXEC sp_helptext '${objectName}'; `;
          } else if (dbType === 'postgres') {
            return `SELECT pg_get_triggerdef((SELECT oid FROM pg_trigger WHERE tgname = '${objectName}' LIMIT 1)); `;
          } else {
            return `SHOW CREATE TRIGGER ${objectName}; `;
          }
        }
        break;

      case 'execute':
        if (objectType === 'procedures') {
          if (dbType === 'sqlserver') {
            return `EXEC ${objectName}; `;
          } else if (dbType === 'postgres') {
            return `CALL ${objectName} (); `;
          } else {
            return `CALL ${objectName} (); `;
          }
        } else if (objectType === 'functions') {
          if (dbType === 'sqlserver') {
            return `SELECT dbo.${objectName} (); `;
          } else if (dbType === 'postgres') {
            return `SELECT ${objectName} (); `;
          } else {
            return `SELECT ${objectName} (); `;
          }
        }
        break;

      default:
        return '';
    }
  };

  const handleQuickAction = async (e, action, objectType, objectName) => {
    e.stopPropagation();
    const sql = generateSQL(action, objectType, objectName);

    let metadata = null;
    if (objectType === 'tables' && (action === 'select100' || action === 'selectAll')) {
      try {
        const dbStr = String(selectedDatabase);
        const isCustom = (typeof dbStr === 'string' && dbStr.startsWith('custom')) ||
          typeof dbStr === 'number' ||
          (!['mysql', 'postgres', 'sqlserver'].includes(dbStr));
        const dbType = isCustom ? 'custom' : selectedDatabase;
        let connStr = isCustom ? customConnection : null;
        if (isCustom && currentDatabase) {
          connStr = getConnectionStringForDb(customConnection, currentDatabase);
        }

        const pks = await getPrimaryKeys(dbType, objectName, connStr);

        metadata = { tableName: objectName, primaryKeys: pks };
      } catch (error) {
        console.warn('Failed to fetch primary keys:', error);
      }
    }

    if (sql && onLoadQuery) {
      onLoadQuery(sql, metadata);
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
    <div className={`database-explorer ${isCollapsed ? 'collapsed' : ''} `}>
      <div className="explorer-header">
        <h3>
          <Database size={18} />
          Explorer
        </h3>
        <div className="header-actions">
          <button
            className="collapse-button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            data-tooltip={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>

          <button
            className="refresh-button"
            onClick={() => setShowConnectionModal(true)}
            data-tooltip="View Connection String"
          >
            <Link size={16} />
          </button>

          <button
            className="refresh-button"
            onClick={handleRefresh}
            disabled={loading || loadingDatabases}
            data-tooltip="Refresh"
          >
            <RefreshCw size={16} className={(loading || loadingDatabases) ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {!selectedDatabase || selectedDatabase === 'custom' ? (
        <div className="empty-state">
          <p>Select a database type to explore</p>
        </div>
      ) : (
        <div className="explorer-content">

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
                data-tooltip="Create new database"
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
                        <span className="item-name" data-tooltip={db}>{db}</span>
                        {currentDatabase === db && <span className="selected-badge">active</span>}
                        <button
                          className="action-btn"
                          onClick={(e) => handleExportDatabase(e, db)}
                          disabled={exporting === db}
                          data-tooltip="Export database"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            fill="currentColor"
                            className={`bi bi-database-fill-down ${exporting === db ? 'spin' : ''}`}
                            viewBox="0 0 16 16"
                          >
                            <path d="M12.5 9a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7m.354 5.854 1.5-1.5a.5.5 0 0 0-.708-.708l-.646.647V10.5a.5.5 0 0 0-1 0v2.793l-.646-.647a.5.5 0 0 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0M8 1c-1.573 0-3.022.289-4.096.777C2.875 2.245 2 2.993 2 4s.875 1.755 1.904 2.223C4.978 6.711 6.427 7 8 7s3.022-.289 4.096-.777C13.125 5.755 14 5.007 14 4s-.875-1.755-1.904-2.223C11.022 1.289 9.573 1 8 1" />
                            <path d="M2 7v-.839c.457.432 1.004.751 1.49.972C4.722 7.693 6.318 8 8 8s3.278-.307 4.51-.867c.486-.22 1.033-.54 1.49-.972V7c0 .424-.155.802-.411 1.133a4.51 4.51 0 0 0-4.815 1.843A12 12 0 0 1 8 10c-1.573 0-3.022-.289-4.096-.777C2.875 8.755 2 8.007 2 7m6.257 3.998L8 11c-1.682 0-3.278-.307-4.51-.867-.486-.22-1.033-.54-1.49-.972V10c0 1.007.875 1.755 1.904 2.223C4.978 12.711 6.427 13 8 13h.027a4.55 4.55 0 0 1 .23-2.002m-.002 3L8 14c-1.682 0-3.278-.307-4.51-.867-.486-.22-1.033-.54-1.49-.972V13c0 1.007.875 1.755 1.904 2.223C4.978 15.711 6.427 16 8 16c.536 0 1.058-.034 1.555-.097a4.5 4.5 0 0 1-1.3-1.905" />
                          </svg>
                        </button>
                        {currentDatabase !== db && (
                          <button
                            className="action-btn delete-btn"
                            onClick={(e) => initiateDelete(e, db)}
                            disabled={deleting === db}
                            style={{ marginLeft: '4px', color: 'var(--error)' }}
                            data-tooltip="Delete database"
                          >
                            <Trash2 size={14} className={deleting === db ? 'spin' : ''} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>


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
                        {items.length > 0 && (
                          <div className="filter-container">
                            <div className="filter-wrapper">
                              <Search size={14} className="filter-icon" />
                              <input
                                type="text"
                                className="filter-input"
                                placeholder={`Filter ${section.label.toLowerCase()}...`}
                                value={filters[section.id] || ''}
                                onChange={(e) => handleFilterChange(section.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                        )}

                        {items.length === 0 ? (
                          <div className="empty-section">No {section.label.toLowerCase()}</div>
                        ) : (
                          <ul className="object-list">
                            {items
                              .filter(item => {
                                const filterText = (filters[section.id] || '').toLowerCase();
                                const itemName = (typeof item === 'string' ? item : item.name).toLowerCase();
                                return !filterText || itemName.includes(filterText);
                              })
                              .map((item, index) => {
                                const itemName = typeof item === 'string' ? item : item.name;
                                const isTableExpanded = section.id === 'tables' && expandedTables[itemName];
                                const details = tableDetails[itemName];

                                return (
                                  <li
                                    key={index}
                                    className={`object-item ${isTableExpanded ? 'expanded-item' : ''}`}
                                  >
                                    <div className="object-item-header" onClick={() => {
                                      if (section.id === 'tables') {
                                        toggleTableExpansion(itemName);
                                      } else {
                                        handleObjectClick(section.id, itemName);
                                      }
                                    }}>
                                      {section.id === 'tables' && (
                                        <span className="expand-icon">
                                          {isTableExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                        </span>
                                      )}
                                      <span className="item-name" data-tooltip={itemName}>
                                        {itemName}
                                        {item.table && <span className="item-meta">on {item.table}</span>}
                                      </span>
                                      <div className="item-actions">
                                        {(section.id === 'tables' || section.id === 'views') && (
                                          <>
                                            <button
                                              className="action-btn"
                                              onClick={(e) => handleQuickAction(e, 'select100', section.id, itemName)}
                                              data-tooltip="SELECT TOP 100"
                                            >
                                              <List size={12} />
                                            </button>
                                            {section.id === 'tables' && (
                                              <>
                                                <button
                                                  className="action-btn"
                                                  onClick={(e) => handleQuickAction(e, 'count', section.id, itemName)}
                                                  data-tooltip="COUNT rows"
                                                >
                                                  <Hash size={12} />
                                                </button>
                                                <button
                                                  className="action-btn"
                                                  onClick={(e) => handleQuickAction(e, 'describe', section.id, itemName)}
                                                  data-tooltip="DESCRIBE table"
                                                >
                                                  <Info size={12} />
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
                                              data-tooltip="Show definition"
                                            >
                                              <Info size={12} />
                                            </button>
                                            <button
                                              className="action-btn"
                                              onClick={(e) => handleQuickAction(e, 'execute', section.id, itemName)}
                                              data-tooltip="Execute template"
                                            >
                                              <Play size={12} />
                                            </button>
                                          </>
                                        )}
                                        {section.id === 'triggers' && (
                                          <button
                                            className="action-btn"
                                            onClick={(e) => handleQuickAction(e, 'showCreate', section.id, itemName)}
                                            data-tooltip="Show definition"
                                          >
                                            <Info size={12} />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {isTableExpanded && details && (
                                      <div className="table-details">
                                        <div className="details-section">
                                          <div className="details-header">
                                            <FileText size={10} /> Columns
                                          </div>
                                          <ul className="details-list">
                                            {details.columns.map((col, idx) => {
                                              const truncateText = (text, maxLength = 10) => {
                                                if (!text) return '';
                                                if (text.length <= maxLength) return text;
                                                return text.substring(0, maxLength - 3) + '...';
                                              };

                                              const displayType = col.type;

                                              return (
                                                <li key={idx} className="detail-item">
                                                  <span className="col-name">
                                                    <span className="truncate" data-tooltip={col.name}>
                                                      {truncateText(col.name, 10)}
                                                    </span>
                                                    {col.isPk && <Key size={10} className="pk-icon" data-tooltip="Primary Key" />}
                                                    {col.isFk && <Link size={10} className="fk-icon" data-tooltip="Foreign Key" />}
                                                  </span>
                                                  <span className="col-type" data-tooltip={col.type}>
                                                    {truncateText(displayType, 10)}
                                                  </span>
                                                </li>
                                              );
                                            })}
                                          </ul>
                                        </div>

                                        {details.foreignKeys && details.foreignKeys.length > 0 && (
                                          <div className="details-section">
                                            <div className="details-header">
                                              <GitMerge size={10} /> Foreign Keys
                                            </div>
                                            <ul className="details-list">
                                              {details.foreignKeys.map((fk, idx) => (
                                                <li key={idx} className="detail-item">
                                                  <span className="fk-name truncate" data-tooltip={fk.name || `FK_${idx}`}>
                                                    {fk.name || `FK_${idx}`}
                                                  </span>
                                                  <span className="fk-ref truncate" data-tooltip={fk.referred_table}>
                                                    → {fk.referred_table}
                                                  </span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}

                                        {details.indexes && details.indexes.length > 0 && (
                                          <div className="details-section">
                                            <div className="details-header">
                                              <List size={10} /> Indexes
                                            </div>
                                            <ul className="details-list">
                                              {details.indexes.map((idx, i) => (
                                                <li key={i} className="detail-item">
                                                  <span className="idx-name truncate" data-tooltip={idx.name}>
                                                    {idx.name}
                                                  </span>
                                                  {idx.unique && <span className="idx-unique">UNIQUE</span>}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    )}
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


      {showCreateModal && (
        <div className="modal-overlay">
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

      {showConnectionModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0 }}>Connection Details</h4>
              <button
                className="modal-close"
                onClick={() => setShowConnectionModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {(typeof selectedDatabase === 'string' && selectedDatabase.startsWith('custom')) || typeof selectedDatabase === 'number' ? (
                <>
                  <p style={{ marginBottom: '8px', fontWeight: 500 }}>Current Connection String:</p>
                  <div style={{
                    padding: '12px',
                    background: 'var(--surface-hover)',
                    borderRadius: '8px',
                    wordBreak: 'break-all',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    border: '1px solid var(--border)'
                  }}>
                    {customConnection || 'No connection string available'}
                  </div>
                </>
              ) : (
                <div style={{ padding: '0 4px' }}>
                  <p style={{ marginBottom: '12px', color: 'var(--text-muted)' }}>
                    Connection string for <strong>{selectedDatabase}</strong> container:
                  </p>
                  <div style={{
                    padding: '12px',
                    background: 'var(--surface-hover)',
                    borderRadius: '8px',
                    wordBreak: 'break-all',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    border: '1px solid var(--border)',
                    marginBottom: '16px'
                  }}>
                    {selectedDatabase === 'mysql' && 'mysql://luisdotcom:!WH0wZ&MD1@QrbR@localhost:9306/master'}
                    {selectedDatabase === 'postgres' && 'postgresql://luisdotcom:!WH0wZ&MD1@QrbR@localhost:9432/master'}
                    {selectedDatabase === 'sqlserver' && 'mssql+pyodbc://sa:!WH0wZ&MD1@QrbR@localhost:9433/master?driver=ODBC+Driver+17+for+SQL+Server'}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    * Uses ports exposed in docker-compose.yml
                  </p>
                </div>
              )}
            </div>
            <div className="modal-actions" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="modal-btn"
                onClick={() => setShowConnectionModal(false)}
                style={{ padding: '8px 16px', borderRadius: '6px', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteModal.show}
        onClose={() => setDeleteModal({ show: false, dbName: null })}
        onConfirm={confirmDelete}
        title="Confirm Deletion"
        message={<span>Are you sure you want to delete database <strong>{deleteModal.dbName}</strong>?</span>}
        confirmText="Delete"
        isDangerous={true}
      />

      <ExportModal
        isOpen={exportModal.show}
        onClose={() => setExportModal({ show: false, dbName: null })}
        onExport={handleConfirmExport}
        databaseName={exportModal.dbName}
        databaseType={selectedDatabase}
        customConnection={customConnection}
      />
    </div>
  );
};

export default DatabaseExplorer;

