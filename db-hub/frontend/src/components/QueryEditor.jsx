
import { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Loader, FileText, Table, Eye, Zap, Code, ChevronUp, ChevronDown, AlignLeft, Plus, MoreVertical, Save, FolderOpen, Clock, Palette } from 'lucide-react';
import { format } from 'sql-formatter';
import CodeMirror from '@uiw/react-codemirror';
import { sql, MySQL, PostgreSQL, StandardSQL } from '@codemirror/lang-sql';
import { autocompletion, acceptCompletion, completionKeymap } from '@codemirror/autocomplete';
import { keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { nord } from '@uiw/codemirror-theme-nord';
import { xcodeLight, xcodeDark } from '@uiw/codemirror-theme-xcode';
import { eclipse } from '@uiw/codemirror-theme-eclipse';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { getSchemaSummary, getConnectionStringForDb } from '../services/databaseService';
import './QueryEditor.css';

const QueryEditor = ({ onExecute, isExecuting, selectedDatabase, externalQuery, onQueryChange, isCollapsed, onToggleCollapse, onHistoryClick, connectionString, databaseName }) => {
  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [schemaSummary, setSchemaSummary] = useState({});
  const [theme, setTheme] = useState('dark');
  const [editorTheme, setEditorTheme] = useState('vscodeDark');
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);

  const THEMES = {
    vscodeDark: { name: 'VS Code Dark', theme: vscodeDark, type: 'dark' },
    githubLight: { name: 'GitHub Light', theme: githubLight, type: 'light' },
    githubDark: { name: 'GitHub Dark', theme: githubDark, type: 'dark' },
    dracula: { name: 'Dracula', theme: dracula, type: 'dark' },
    nord: { name: 'Nord', theme: nord, type: 'dark' },
    xcodeLight: { name: 'Xcode Light', theme: xcodeLight, type: 'light' },
    xcodeDark: { name: 'Xcode Dark', theme: xcodeDark, type: 'dark' },
    eclipse: { name: 'Eclipse', theme: eclipse, type: 'light' },
  };

  const coreDbType = useMemo(() => {
    if (connectionString) {
      if (connectionString.includes('postgres') || connectionString.includes('psycopg2')) return 'postgres';
      if (connectionString.includes('sqlserver') || connectionString.includes('mssql') || connectionString.includes('pyodbc')) return 'sqlserver';
      return 'mysql';
    }
    if (selectedDatabase === 'postgres') return 'postgres';
    if (selectedDatabase === 'sqlserver') return 'sqlserver';
    return 'mysql';
  }, [selectedDatabase, connectionString]);

  useEffect(() => {
    const fetchSchema = async () => {
      if (selectedDatabase) {
        try {
          const dbSpecificConnString = connectionString ? getConnectionStringForDb(connectionString, databaseName) : null;

          const summary = await getSchemaSummary(coreDbType, dbSpecificConnString);
          setSchemaSummary(summary);
        } catch (error) {
          console.error("Failed to fetch schema summary", error);
        }
      }
    };
    fetchSchema();
  }, [selectedDatabase, connectionString, databaseName, coreDbType]);

  useEffect(() => {
    if (externalQuery) {
      setQuery(externalQuery);
      if (onQueryChange) onQueryChange('');
    }
  }, [externalQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.dropdown-container')) {
        setIsDropdownOpen(false);
      }
      if (isThemeDropdownOpen && !event.target.closest('.theme-dropdown-container')) {
        setIsThemeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen, isThemeDropdownOpen]);


  useEffect(() => {
    const getStoredTheme = (mode) => localStorage.getItem(`dbhub_editor_theme_${mode}`);

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    setTheme(currentTheme);

    const stored = getStoredTheme(currentTheme);
    setEditorTheme(stored || (currentTheme === 'dark' ? 'vscodeDark' : 'githubLight'));

    const observer = new MutationObserver(() => {
      const newTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      setTheme(newTheme);

      const storedNew = getStoredTheme(newTheme);
      setEditorTheme(storedNew || (newTheme === 'dark' ? 'vscodeDark' : 'githubLight'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, []);

  const handleExecute = () => {
    if (query.trim() && selectedDatabase) {
      onExecute(query);
    }
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
    }
  };

  const handleFormat = () => {
    if (!query.trim()) return;
    try {
      const formatted = format(query, {
        language: coreDbType === 'postgres' ? 'postgresql' :
          coreDbType === 'sqlserver' ? 'transactsql' : 'mysql',
        keywordCase: 'upper',
      });

      const fixed = formatted.replace(/DELIMITER\s+\/\s+\//gi, 'DELIMITER //');

      setQuery(fixed);
    } catch (error) {
      console.error('Error formatting query:', error);
    }
  };

  const sqlTemplates = {
    tables: {
      mysql: `CREATE TABLE table_name (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`,
      postgres: `CREATE TABLE table_name (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`,
      sqlserver: `CREATE TABLE table_name (
    id INT PRIMARY KEY IDENTITY(1,1),
    name NVARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);`
    },
    views: {
      mysql: `CREATE VIEW view_name AS
SELECT column1, column2
FROM table_name
WHERE condition;`,
      postgres: `CREATE VIEW view_name AS
SELECT column1, column2
FROM table_name
WHERE condition;`,
      sqlserver: `CREATE VIEW view_name AS
SELECT column1, column2
FROM table_name
WHERE condition;`
    },
    procedures: {
      mysql: `DELIMITER //
CREATE PROCEDURE procedure_name(
    IN param1 INT,
    OUT param2 VARCHAR(100)
)
BEGIN
    SELECT name INTO param2 FROM table_name WHERE id = param1;
END //
DELIMITER ;`,
      postgres: `CREATE OR REPLACE PROCEDURE procedure_name(
    param1 INT,
    INOUT param2 VARCHAR(100)
)
LANGUAGE plpgsql
AS $$
BEGIN
    SELECT name INTO param2 FROM table_name WHERE id = param1;
END;
$$;`,
      sqlserver: `CREATE PROCEDURE procedure_name
    @param1 INT,
    @param2 NVARCHAR(100) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT @param2 = name FROM table_name WHERE id = @param1;
END;`
    },
    functions: {
      mysql: `DELIMITER //
CREATE FUNCTION function_name(param1 INT)
RETURNS VARCHAR(100)
DETERMINISTIC
BEGIN
    DECLARE result VARCHAR(100);
    SELECT name INTO result FROM table_name WHERE id = param1;
    RETURN result;
END //
DELIMITER ;`,
      postgres: `CREATE OR REPLACE FUNCTION function_name(param1 INT)
RETURNS VARCHAR(100)
LANGUAGE plpgsql
AS $$
DECLARE
    result VARCHAR(100);
BEGIN
    SELECT name INTO result FROM table_name WHERE id = param1;
    RETURN result;
END;
$$;`,
      sqlserver: `CREATE FUNCTION function_name(@param1 INT)
RETURNS NVARCHAR(100)
AS
BEGIN
    DECLARE @result NVARCHAR(100);
    SELECT @result = name FROM table_name WHERE id = @param1;
    RETURN @result;
END;`
    },
    triggers: {
      mysql: `DELIMITER //
CREATE TRIGGER trigger_name
AFTER INSERT ON table_name
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (action, timestamp) 
    VALUES ('INSERT', NOW());
END //
DELIMITER ;`,
      postgres: `CREATE OR REPLACE FUNCTION trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO audit_log (action, timestamp) 
    VALUES ('INSERT', CURRENT_TIMESTAMP);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_name
AFTER INSERT ON table_name
FOR EACH ROW
EXECUTE FUNCTION trigger_function();`,
      sqlserver: `CREATE TRIGGER trigger_name
ON table_name
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO audit_log (action, timestamp) 
    VALUES ('INSERT', GETDATE());
END;`
    }
  };

  const loadTemplate = (type) => {
    const template = sqlTemplates[type]?.[coreDbType] || sqlTemplates[type]?.mysql || '';
    setQuery(template);
    setIsDropdownOpen(false);
  };

  const handleSaveQuery = () => {
    if (!query.trim()) return;
    const blob = new Blob([query], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `query_${new Date().getTime()}.sql`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadQuery = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setQuery(event.target.result);
      if (onQueryChange) onQueryChange('');
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const extensions = useMemo(() => {
    const dialect = coreDbType === 'postgres' ? PostgreSQL : coreDbType === 'sqlserver' ? StandardSQL : MySQL;

    const customKeymap = Prec.highest(keymap.of([
      { key: "Tab", run: acceptCompletion },
      ...completionKeymap.filter(k => k.key !== 'Enter')
    ]));

    return [
      sql({
        schema: schemaSummary,
        dialect: dialect,
        upperCaseKeywords: true
      }),
      autocompletion({ defaultKeymap: false }),
      customKeymap
    ];
  }, [schemaSummary, coreDbType]);


  return (
    <div className="query-editor">
      <div className="editor-header">
        <h2 className="editor-title">
          <FileText size={20} />
          <span>SQL Query</span>
        </h2>
        <div className="help-buttons">
          <div className="dropdown-container theme-dropdown-container">
            <button
              className="help-btn"
              onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
              data-tooltip="Editor Theme"
            >
              <Palette size={16} />
              <span>Theme</span>
            </button>
            {isThemeDropdownOpen && (
              <div className="dropdown-menu">
                {Object.entries(THEMES)
                  .filter(([_, t]) => t.type === theme)
                  .map(([key, t]) => (
                    <button
                      key={key}
                      className={`dropdown-item ${editorTheme === key ? 'active' : ''}`}
                      onClick={() => {
                        setEditorTheme(key);
                        localStorage.setItem(`dbhub_editor_theme_${theme}`, key);
                        setIsThemeDropdownOpen(false);
                      }}
                    >
                      <span>{t.name}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
          <div className="dropdown-container">
            <input
              type="file"
              accept=".sql"
              onChange={handleLoadQuery}
              style={{ display: 'none' }}
              id="load-query-input"
            />
            <button
              className="help-btn"
              onClick={() => document.getElementById('load-query-input').click()}
              data-tooltip="Load Query"
            >
              <FolderOpen size={16} />
              <span>Load</span>
            </button>
          </div>
          <button
            className="help-btn"
            onClick={handleSaveQuery}
            disabled={!query.trim()}
            data-tooltip="Save Query"
          >
            <Save size={16} />
            <span>Save</span>
          </button>
          <button
            className="help-btn"
            onClick={handleFormat}
            disabled={!query.trim()}
            data-tooltip="Format Query"
          >
            <AlignLeft size={16} />
            <span>Format</span>
          </button>
          <button
            className="help-btn"
            onClick={onHistoryClick}
            data-tooltip="View History"
          >
            <Clock size={16} />
            <span>History</span>
          </button>
          <div className="dropdown-container">
            <button
              className={`dropdown-toggle ${isDropdownOpen ? 'active' : ''}`}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={!selectedDatabase}
              data-tooltip="Create new object"
            >
              <Plus size={16} />
              <span>Create</span>
              <ChevronDown size={14} />
            </button>

            {isDropdownOpen && (
              <div className="dropdown-menu">
                <button
                  className="dropdown-item"
                  onClick={() => loadTemplate('tables')}
                >
                  <Table size={16} />
                  <span>Table</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => loadTemplate('views')}
                >
                  <Eye size={16} />
                  <span>View</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => loadTemplate('procedures')}
                >
                  <Zap size={16} />
                  <span>Procedure</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => loadTemplate('functions')}
                >
                  <Code size={16} />
                  <span>Function</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => loadTemplate('triggers')}
                >
                  <Zap size={16} />
                  <span>Trigger</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {
        !isCollapsed && (
          <div className="code-editor-container" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <CodeMirror
              value={query}
              height="100%"
              theme={THEMES[editorTheme]?.theme || vscodeDark}
              extensions={extensions}
              onChange={(value) => setQuery(value)}
              onKeyDown={handleKeyDown}
              className="codemirror-editor"
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                dropCursor: true,
                allowMultipleSelections: true,
                indentOnInput: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: false,
                highlightActiveLine: true,
                highlightSelectionMatches: true,
              }}
              style={{ fontSize: '14px', height: '100%' }}
            />
          </div>
        )
      }
      <div className="editor-footer">
        <span className="hint">Press Ctrl+Enter to execute</span>
        <div className="footer-actions">
          <button
            className="execute-button"
            onClick={handleExecute}
            data-tooltip={!selectedDatabase ? "Select a database to execute queries" : !query.trim() ? "Enter a query to execute" : ""}
            disabled={!query.trim() || !selectedDatabase || isExecuting}
          >
            {isExecuting ? (
              <>
                <Loader size={18} className="spin" />
                <span>Executing...</span>
              </>
            ) : (
              <>
                <Play size={18} />
                <span>Execute Query</span>
              </>
            )}
          </button>

        </div>
      </div>
    </div >
  );
};

export default QueryEditor;
