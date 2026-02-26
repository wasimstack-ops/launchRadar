import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

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
