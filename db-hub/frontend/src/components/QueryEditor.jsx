
import { useState, useEffect, useRef } from 'react';
import { Play, Loader, FileText, Table, Eye, Zap, Code, ChevronUp, ChevronDown, AlignLeft, Plus, MoreVertical, Save, FolderOpen } from 'lucide-react';
import { format } from 'sql-formatter';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './QueryEditor.css';

const QueryEditor = ({ onExecute, isExecuting, selectedDatabase, externalQuery, onQueryChange, isCollapsed, onToggleCollapse }) => {
  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const textareaRef = useRef(null);
  const highlighterRef = useRef(null);

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
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    setTheme(currentTheme);

    const observer = new MutationObserver(() => {
      const newTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      setTheme(newTheme);
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

    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newValue = query.substring(0, start) + '  ' + query.substring(end);
      setQuery(newValue);

      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const handleFormat = () => {
    if (!query.trim()) return;
    try {
      const formatted = format(query, {
        language: selectedDatabase === 'postgres' ? 'postgresql' :
          selectedDatabase === 'sqlserver' ? 'transactsql' : 'mysql',
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
    const dbType = selectedDatabase === 'sqlserver' ? 'sqlserver' :
      selectedDatabase === 'postgres' ? 'postgres' : 'mysql';
    const template = sqlTemplates[type]?.[dbType] || sqlTemplates[type]?.mysql || '';
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

  const handleScroll = (e) => {
    if (highlighterRef.current) {
      highlighterRef.current.scrollTop = e.target.scrollTop;
      highlighterRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  return (
    <div className="query-editor">
      <div className="editor-header">
        <h2 className="editor-title">
          <FileText size={20} />
          SQL Query
        </h2>
        <div className="help-buttons">
          <div className="dropdown-container" style={{ marginRight: '8px' }}>
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
            style={{ marginRight: '8px' }}
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
      {!isCollapsed && (
        <div className="code-editor-container">
          <div className="syntax-highlighter-wrapper" ref={highlighterRef}>
            <SyntaxHighlighter
              language="sql"
              style={theme === 'dark' ? vscDarkPlus : vs}
              customStyle={{
                margin: 0,
                padding: '1rem',
                backgroundColor: 'transparent',
                borderRadius: '8px',
                fontSize: '0.9rem',
                lineHeight: '1.6',
                minHeight: '100%',
                whiteSpace: 'pre',
                fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace"
              }}
              codeTagProps={{
                style: {
                  fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace"
                }
              }}
            >
              {query || ' '}
            </SyntaxHighlighter>
          </div>
          <textarea
            ref={textareaRef}
            className="query-textarea-overlay"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            placeholder=""
            disabled={!selectedDatabase}
            spellCheck={false}
          />
        </div>
      )}
      <div className="editor-footer">
        <span className="hint">Press Ctrl+Enter to execute</span>
        <div className="footer-actions">
          <button
            className="execute-button"
            onClick={handleExecute}
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
    </div>
  );
};

export default QueryEditor;
