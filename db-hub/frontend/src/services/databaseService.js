
import apiClient from '../config/api';


export const executeQuery = async (databaseType, query, connectionString = null) => {
  const response = await apiClient.post('/api/query/execute', {
    database_type: databaseType,
    query: query,
    connection_string: connectionString
  });
  return response.data;
};


const getDbTypeFromStr = (str) => {
  if (!str) return 'mysql';
  if (str.startsWith('mysql')) return 'mysql';
  if (str.startsWith('postgresql') || str.startsWith('postgres')) return 'postgres';
  if (str.startsWith('mssql')) return 'sqlserver';
  return 'mysql';
};

export const getDatabases = async (databaseType, connectionString = null) => {
  if (connectionString) {
    const type = getDbTypeFromStr(connectionString);
    let query = '';
    if (type === 'mysql') query = "SHOW DATABASES";
    else if (type === 'postgres') query = "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname";
    else if (type === 'sqlserver') query = "SELECT name FROM sys.databases ORDER BY name";
    
    const result = await executeQuery('custom', query, connectionString);
    if (!result.success) throw new Error(result.message);
    
    return result.rows.map(row => Object.values(row)[0]).filter(db => {
      if (type === 'mysql') return !['information_schema', 'mysql', 'performance_schema', 'sys'].includes(db);
      if (type === 'postgres') return !['postgres'].includes(db);
      return true;
    });
  }
  const response = await apiClient.get(`/api/query/databases/${databaseType}`);
  return response.data;
};


export const createDatabase = async (databaseType, databaseName) => {
  const response = await apiClient.post(`/api/query/databases/${databaseType}?database_name=${encodeURIComponent(databaseName)}`);
  return response.data;
};


export const deleteDatabase = async (databaseType, databaseName, connectionString = null) => {
  let url = `/api/query/databases/${databaseType}?database_name=${encodeURIComponent(databaseName)}`;
  if (connectionString) {
    url += `&connection_string=${encodeURIComponent(connectionString)}`;
  }
  const response = await apiClient.delete(url);
  return response.data;
};


export const getConnectionStringForDb = (connectionString, dbName) => {
  if (!connectionString || !dbName) return connectionString;
  const type = getDbTypeFromStr(connectionString);
  
  try {
    const url = new URL(connectionString.replace('mysql+pymysql://', 'http://')
                                        .replace('postgresql+psycopg2://', 'http://')
                                        .replace('mssql+pyodbc://', 'http://'));
    
    const protocol = connectionString.split('://')[0];
    
    if (type === 'sqlserver') {
       const parts = connectionString.split('?');
       const base = parts[0].substring(0, parts[0].lastIndexOf('/'));
       const query = parts.length > 1 ? `?${parts[1]}` : '';
       return `${base}/${dbName}${query}`;
    }

    const base = connectionString.substring(0, connectionString.lastIndexOf('/'));
    return `${base}/${dbName}`;
  } catch (e) {
    console.error('Failed to parse connection string:', e);
    return connectionString;
  }
};

export const selectDatabase = async (databaseType, databaseName, connectionString = null) => {
    if (connectionString) {
    return { success: true, message: `Switched to ${databaseName}` };
  }
  const response = await apiClient.put(`/api/query/databases/${databaseType}/select?database_name=${encodeURIComponent(databaseName)}`);
  return response.data;
};


export const getTables = async (databaseType, connectionString = null) => {
  if (connectionString) {
    const type = getDbTypeFromStr(connectionString);
    let query = '';
    if (type === 'mysql') query = "SHOW FULL TABLES WHERE Table_Type = 'BASE TABLE'";
    else if (type === 'postgres') query = "SELECT tablename FROM pg_tables WHERE schemaname = 'public'";
    else if (type === 'sqlserver') query = "SELECT name FROM sys.tables";

    const result = await executeQuery('custom', query, connectionString);
    if (!result.success) throw new Error(result.message);
    return result.rows.map(row => Object.values(row)[0]);
  }
  const response = await apiClient.get(`/api/query/tables/${databaseType}`);
  return response.data;
};


export const getTableSchema = async (databaseType, tableName) => {
  const response = await apiClient.get(`/api/query/schema/${databaseType}/${tableName}`);
  return response.data;
};


export const testConnection = async (databaseType) => {
  const response = await apiClient.get(`/api/query/connection/test/${databaseType}`);
  return response.data;
};


export const getViews = async (databaseType, connectionString = null) => {
  if (connectionString) {
    const type = getDbTypeFromStr(connectionString);
    let query = '';
    if (type === 'mysql') query = "SHOW FULL TABLES WHERE Table_Type = 'VIEW'";
    else if (type === 'postgres') query = "SELECT viewname FROM pg_views WHERE schemaname = 'public'";
    else if (type === 'sqlserver') query = "SELECT name FROM sys.views";

    const result = await executeQuery('custom', query, connectionString);
    if (!result.success) throw new Error(result.message);
    return result.rows.map(row => Object.values(row)[0]);
  }
  const response = await apiClient.get(`/api/query/views/${databaseType}`);
  return response.data;
};


export const getProcedures = async (databaseType, connectionString = null) => {
  if (connectionString) {
    const type = getDbTypeFromStr(connectionString);
    let query = '';
    if (type === 'mysql') query = "SELECT ROUTINE_NAME, ROUTINE_TYPE FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_TYPE = 'PROCEDURE'";
    else if (type === 'postgres') query = "SELECT proname FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND prokind = 'p'";
    else if (type === 'sqlserver') query = "SELECT name FROM sys.procedures";

    const result = await executeQuery('custom', query, connectionString);
    if (!result.success) throw new Error(result.message);
    return result.rows.map(row => ({ name: Object.values(row)[0], type: 'PROCEDURE' }));
  }
  const response = await apiClient.get(`/api/query/procedures/${databaseType}`);
  return response.data;
};


export const getFunctions = async (databaseType, connectionString = null) => {
  if (connectionString) {
    const type = getDbTypeFromStr(connectionString);
    let query = '';
    if (type === 'mysql') query = "SELECT ROUTINE_NAME, ROUTINE_TYPE FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_TYPE = 'FUNCTION'";
    else if (type === 'postgres') query = "SELECT proname FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND prokind = 'f'";
    else if (type === 'sqlserver') query = "SELECT name FROM sys.objects WHERE type IN ('FN', 'IF', 'TF')";

     const result = await executeQuery('custom', query, connectionString);
    if (!result.success) throw new Error(result.message);
    return result.rows.map(row => ({ name: Object.values(row)[0], type: 'FUNCTION' }));
  }
  const response = await apiClient.get(`/api/query/functions/${databaseType}`);
  return response.data;
};


export const getTriggers = async (databaseType, connectionString = null) => {
  if (connectionString) {
     const type = getDbTypeFromStr(connectionString);
    let query = '';
    if (type === 'mysql') query = "SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE()";
    else if (type === 'postgres') query = "SELECT tgname FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND NOT t.tgisinternal";
    else if (type === 'sqlserver') query = "SELECT name FROM sys.triggers";

    const result = await executeQuery('custom', query, connectionString);
    if (!result.success) throw new Error(result.message);
    return result.rows.map(row => ({ name: Object.values(row)[0], table: '', event: '' }));
  }
  const response = await apiClient.get(`/api/query/triggers/${databaseType}`);
  return response.data;
};


export const exportDatabase = async (databaseType, databaseName) => {
  const response = await apiClient.get(`/api/query/export/${databaseType}/${databaseName}`, {
    responseType: 'blob'
  });
  

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${databaseName}_backup.sql`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};
