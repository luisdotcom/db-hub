import apiClient from '../config/api';

export const getConnections = async () => {
  const response = await apiClient.get('/connections/');
  return response.data;
};

export const createConnection = async (connection) => {
  const response = await apiClient.post('/connections/', connection);
  return response.data;
};

export const updateConnection = async (id, connection) => {
  const response = await apiClient.put(`/connections/${id}`, connection);
  return response.data;
};

export const deleteConnection = async (id) => {
  const response = await apiClient.delete(`/connections/${id}`);
  return response.data;
};
