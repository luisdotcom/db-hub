import { useState, useMemo } from 'react';
import { CheckCircle, XCircle, Table, AlertCircle, FileDown, ArrowUp, ArrowDown, ArrowUpDown, Search, ChevronUp, ChevronDown } from 'lucide-react';
import './QueryResults.css';

const QueryResults = ({ result, error, isCollapsed, onToggleCollapse }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');

  const processedRows = useMemo(() => {
    if (!result?.rows) return [];

    let rows = [...result.rows];

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      rows = rows.filter(row =>
        Object.values(row).some(val =>
          String(val).toLowerCase().includes(lowerTerm)
        )
      );
    }

    if (sortConfig.key) {
      rows.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === null) return 1;
        if (bValue === null) return -1;
        if (aValue === bValue) return 0;

        const comparison = aValue > bValue ? 1 : -1;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return rows;
  }, [result, searchTerm, sortConfig]);

  const exportToJSON = () => {
    if (!result?.rows) return;

    const dataStr = JSON.stringify(result.rows, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `query_results_${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    if (!result?.rows || !result?.columns) return;


    const headers = result.columns.join(',');
    const rows = result.rows.map(row =>
      result.columns.map(col => {
        const value = row[col];
        if (value === null || value === undefined) return '';
        const stringValue = String(value);

        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    ).join('\n');

    const csv = `${headers}\n${rows}`;
    const dataBlob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `query_results_${new Date().getTime()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };





  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };


  return (
    <div className={`query-results ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="result-header success">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {result && result.success ? <CheckCircle size={20} /> : error || (result && !result.success) ? <XCircle size={20} /> : <Table size={20} />}
          <h3>Query Results</h3>
          {result && (
            <span className="row-count" style={{ marginLeft: '12px' }}>
              {result?.rows?.length || 0} row(s) returned
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          {result?.rows?.length > 0 && (
            <div className="search-container">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          )}
          <div className="export-buttons">
            <button className="export-btn" onClick={exportToJSON} data-tooltip="Export as JSON" disabled={!result?.rows}>
              <FileDown size={16} />
              <span>JSON</span>
            </button>
            <button className="export-btn" onClick={exportToExcel} data-tooltip="Export as CSV" disabled={!result?.rows}>
              <FileDown size={16} />
              <span>CSV</span>
            </button>
            <button
              className="export-btn"
              onClick={onToggleCollapse}
              style={{ marginLeft: '8px', padding: '4px' }}
              data-tooltip={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <>

          {(!result && !error) ? (
            <div className="empty-state" style={{ padding: '40px' }}>
              <Table size={48} className="empty-icon" />
              <p>Execute a query to see results here</p>
            </div>
          ) : error || (result && !result.success) ? (
            <div className="error-message">
              <AlertCircle size={20} />
              <p>{error || result.message}</p>
            </div>
          ) : (result.rows_affected !== null && result.rows_affected !== undefined) ? (
            <div className="success-message">
              <p><strong>{result.rows_affected}</strong> row(s) affected</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="results-table">
                <thead>
                  <tr>
                    {result.columns?.map((column, index) => (
                      <th
                        key={index}
                        onClick={() => requestSort(column)}
                        className="sortable-header"
                      >
                        <div className="header-content">
                          {column}
                          {sortConfig.key === column ? (
                            sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                          ) : (
                            <ArrowUpDown size={14} className="sort-icon-inactive" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {processedRows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {result.columns?.map((column, colIndex) => (
                        <td key={colIndex}>
                          {row[column] !== null && row[column] !== undefined
                            ? String(row[column])
                            : <span className="null-value">NULL</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default QueryResults;
