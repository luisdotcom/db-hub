
import { CheckCircle, XCircle, Table, AlertCircle, FileDown } from 'lucide-react';
import './QueryResults.css';

const QueryResults = ({ result, error }) => {
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

  if (!result && !error) {
    return (
      <div className="query-results empty">
        <div className="empty-state">
          <Table size={48} className="empty-icon" />
          <p>Execute a query to see results here</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="query-results">
        <div className="result-header error">
          <XCircle size={20} />
          <h3>Query Failed</h3>
        </div>
        <div className="error-message">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!result.success) {
    return (
      <div className="query-results">
        <div className="result-header error">
          <XCircle size={20} />
          <h3>Query Failed</h3>
        </div>
        <div className="error-message">
          <AlertCircle size={20} />
          <p>{result.message}</p>
        </div>
      </div>
    );
  }


  if (result.rows_affected !== null && result.rows_affected !== undefined) {
    return (
      <div className="query-results">
        <div className="result-header success">
          <CheckCircle size={20} />
          <h3>Query Executed Successfully</h3>
        </div>
        <div className="success-message">
          <p>
            <strong>{result.rows_affected}</strong> row(s) affected
          </p>
        </div>
      </div>
    );
  }


  return (
    <div className="query-results">
      <div className="result-header success">
        <CheckCircle size={20} />
        <h3>Query Results</h3>
        <span className="row-count">
          {result.rows?.length || 0} row(s) returned
        </span>
        <div className="export-buttons">
          <button className="export-btn" onClick={exportToJSON} title="Export as JSON">
            <FileDown size={16} />
            <span>JSON</span>
          </button>
          <button className="export-btn" onClick={exportToExcel} title="Export as CSV">
            <FileDown size={16} />
            <span>CSV</span>
          </button>
        </div>
      </div>
      <div className="table-container">
        <table className="results-table">
          <thead>
            <tr>
              {result.columns?.map((column, index) => (
                <th key={index}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows?.map((row, rowIndex) => (
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
    </div>
  );
};

export default QueryResults;
