import axios from 'axios';

export const API_URL = '/api';

export const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
});

export const authGet = (url, config = {}) =>
  axios.get(`${API_URL}${url}`, { ...config, headers: { ...getAuthHeaders(), ...config.headers } });

export const authPost = (url, data = {}, config = {}) =>
  axios.post(`${API_URL}${url}`, data, { ...config, headers: { ...getAuthHeaders(), ...config.headers } });

export const authPut = (url, data = {}, config = {}) =>
  axios.put(`${API_URL}${url}`, data, { ...config, headers: { ...getAuthHeaders(), ...config.headers } });

export const authDelete = (url, config = {}) =>
  axios.delete(`${API_URL}${url}`, { ...config, headers: { ...getAuthHeaders(), ...config.headers } });
