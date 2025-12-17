
import { useState, useEffect } from 'react';
import { Play, Loader, FileText, Table, Eye, Zap, Code, ChevronUp, ChevronDown } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './QueryEditor.css';

const QueryEditor = ({ onExecute, isExecuting, selectedDatabase, externalQuery, onQueryChange }) => {
  const [query, setQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);


  useEffect(() => {
    if (externalQuery) {
      setQuery(externalQuery);
      if (onQueryChange) onQueryChange('');
    }
  }, [externalQuery]);
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
      mysql: `-- Author: Your Name
-- Date: ${new Date().toISOString().split('T')[0]}
-- Description: View to display specific columns from table_name
CREATE VIEW view_name AS
SELECT column1, column2
FROM table_name
WHERE condition;`,
      postgres: `-- Author: Your Name
-- Date: ${new Date().toISOString().split('T')[0]}
-- Description: View to display specific columns from table_name
CREATE VIEW view_name AS
SELECT column1, column2
FROM table_name
WHERE condition;`,
      sqlserver: `-- Author: Your Name
-- Date: ${new Date().toISOString().split('T')[0]}
-- Description: View to display specific columns from table_name
CREATE VIEW view_name AS
SELECT column1, column2
FROM table_name
WHERE condition;`
    },
    procedures: {
      mysql: `-- Author: Your Name
-- Date: ${new Date().toISOString().split('T')[0]}
-- Description: Procedure to retrieve name from table_name by id
DELIMITER //
CREATE PROCEDURE procedure_name(
    IN param1 INT,
    OUT param2 VARCHAR(100)
)
BEGIN
    -- Your SQL statements here
    SELECT name INTO param2 FROM table_name WHERE id = param1;
END //
DELIMITER ;`,
      postgres: `-- Author: Your Name
-- Date: ${new Date().toISOString().split('T')[0]}
-- Description: Procedure to retrieve name from table_name by id
CREATE OR REPLACE PROCEDURE procedure_name(
    param1 INT,
    INOUT param2 VARCHAR(100)
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Your SQL statements here
    SELECT name INTO param2 FROM table_name WHERE id = param1;
END;
$$;`,
      sqlserver: `-- Author: Your Name
-- Date: ${new Date().toISOString().split('T')[0]}
-- Description: Procedure to retrieve name from table_name by id
CREATE PROCEDURE procedure_name
    @param1 INT,
    @param2 NVARCHAR(100) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    -- Your SQL statements here
    SELECT @param2 = name FROM table_name WHERE id = @param1;
END;`
    },
    functions: {
      mysql: `-- Author: Your Name
-- Date: ${new Date().toISOString().split('T')[0]}
-- Description: Function to retrieve name from table_name by id
DELIMITER //
CREATE FUNCTION function_name(param1 INT)
RETURNS VARCHAR(100)
DETERMINISTIC
BEGIN
    DECLARE result VARCHAR(100);
    -- Your SQL statements here
    SELECT name INTO result FROM table_name WHERE id = param1;
    RETURN result;
END //
DELIMITER ;`,
      postgres: `-- Author: Your Name
-- Date: ${new Date().toISOString().split('T')[0]}
-- Description: Function to retrieve name from table_name by id
CREATE OR REPLACE FUNCTION function_name(param1 INT)
RETURNS VARCHAR(100)
LANGUAGE plpgsql
AS $$
DECLARE
    result VARCHAR(100);
BEGIN
    -- Your SQL statements here
    SELECT name INTO result FROM table_name WHERE id = param1;
    RETURN result;
END;
$$;`,
      sqlserver: `-- Author: Your Name
-- Date: ${new Date().toISOString().split('T')[0]}
-- Description: Function to retrieve name from table_name by id
CREATE FUNCTION function_name(@param1 INT)
RETURNS NVARCHAR(100)
AS
BEGIN
    DECLARE @result NVARCHAR(100);
    -- Your SQL statements here
    SELECT @result = name FROM table_name WHERE id = @param1;
    RETURN @result;
END;`
    },
    triggers: {
      mysql: `-- Author: Your Name
-- Date: ${new Date().toISOString().split('T')[0]}
-- Description: Trigger to log insert operations on table_name
DELIMITER //
CREATE TRIGGER trigger_name
AFTER INSERT ON table_name
FOR EACH ROW
BEGIN
    -- Your trigger logic here
    INSERT INTO audit_log (action, timestamp) 
    VALUES ('INSERT', NOW());
END //
DELIMITER ;`,
      postgres: `-- Author: Your Name
-- Date: ${new Date().toISOString().split('T')[0]}
-- Description: Trigger to log insert operations on table_name
CREATE OR REPLACE FUNCTION trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Your trigger logic here
    INSERT INTO audit_log (action, timestamp) 
    VALUES ('INSERT', CURRENT_TIMESTAMP);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_name
AFTER INSERT ON table_name
FOR EACH ROW
EXECUTE FUNCTION trigger_function();`,
      sqlserver: `-- Author: Your Name
-- Date: ${new Date().toISOString().split('T')[0]}
-- Description: Trigger to log insert operations on table_name
CREATE TRIGGER trigger_name
ON table_name
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    -- Your trigger logic here
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
  };

  return (
    <div className="query-editor">
      <div className="editor-header">
        <h2 className="editor-title">
          <FileText size={20} />
          SQL Query
        </h2>
        <div className="help-buttons">
          <button
            className="help-btn"
            onClick={() => loadTemplate('tables')}
            disabled={!selectedDatabase}
          >
            <Table size={16} title="Create Table" />
            <span>Table</span>
          </button>
          <button
            className="help-btn"
            onClick={() => loadTemplate('views')}
            disabled={!selectedDatabase}
          >
            <Eye size={16} title="Create View" />
            <span>View</span>
          </button>
          <button
            className="help-btn"
            onClick={() => loadTemplate('procedures')}
            disabled={!selectedDatabase}
          >
            <Zap size={16} title="Create Procedure" />
            <span>Procedure</span>
          </button>
          <button
            className="help-btn"
            onClick={() => loadTemplate('functions')}
            disabled={!selectedDatabase}
          >
            <Code size={16} title="Create Function" />
            <span>Function</span>
          </button>
          <button
            className="help-btn"
            onClick={() => loadTemplate('triggers')}
            disabled={!selectedDatabase}
          >
            <Zap size={16} title="Create Trigger" />
            <span>Trigger</span>
          </button>
        </div>
      </div>
      {!isCollapsed && (
        <div className="code-editor-container">
          <SyntaxHighlighter
            language="sql"
            style={theme === 'dark' ? vscDarkPlus : vs}
            customStyle={{
              margin: 0,
              padding: '1rem',
              backgroundColor: 'var(--background)',
              borderRadius: '8px',
              fontSize: '0.9rem',
              lineHeight: '1.6',
              minHeight: '200px',
              fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace"
            }}
            codeTagProps={{
              style: {
                fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace"
              }
            }}
          >
            {query || '-- Enter your SQL query here... (Ctrl+Enter to execute)'}
          </SyntaxHighlighter>
          <textarea
            className="query-textarea-overlay"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
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
          <button className="editor-collapse-button" onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? <ChevronDown size={16} title="Expand" /> : <ChevronUp size={16} title="Collapse" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QueryEditor;
