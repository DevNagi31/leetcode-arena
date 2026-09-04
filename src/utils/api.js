import axios from 'axios';

// Same-origin by default: in production the Express server serves this build,
// and in development Vite proxies /api and /socket.io to it (see
// vite.config.js). VITE_API_URL overrides it when the API is deployed on a
// different origin.
const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export const API_URL = `${API_ORIGIN}/api`;

// Where the Socket.io server lives. Must match the API origin, not the page
// origin — pointing it at the page origin broke chat in development, where the
// page is on :3000 and the server on :5001.
export const SOCKET_URL = API_ORIGIN || window.location.origin;

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
