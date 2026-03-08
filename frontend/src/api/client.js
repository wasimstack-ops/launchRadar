import axios from 'axios';

const runtimeHost = typeof window !== 'undefined' ? window.location.hostname : '';
const isLocalRuntime = runtimeHost === 'localhost' || runtimeHost === '127.0.0.1';
const baseURL = isLocalRuntime
  ? 'http://localhost:5000'
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const adminKey = localStorage.getItem('adminKey');
  const userToken = localStorage.getItem('userToken');

  if (adminKey) {
    config.headers['x-admin-key'] = adminKey;
  }

  if (userToken) {
    config.headers.Authorization = `Bearer ${userToken}`;
  }

  return config;
});

export default api;
