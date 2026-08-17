import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

axiosInstance.interceptors.request.use((config) => {
  let token = null;
  const path = window.location.pathname;

  if (path.startsWith('/admin')) {
    token = localStorage.getItem('admin_token');
  } else if (path.startsWith('/vendor')) {
    token = localStorage.getItem('vendor_token');
  } else {
    // Default to user token for user routes
    token = localStorage.getItem('token');
  }
  
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
}, (error) => Promise.reject(error));

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config.url;
      // Only clear auth and trigger logout if the request actually included a token
      if (error.config.headers.Authorization || error.config.headers?.authorization) {
        if (url.includes('/admin/')) {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin');
          window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { role: 'admin' } }));
        } else if (url.includes('/vendor') || url.includes('/vendors/profile') || url.includes('/salons/vendor/')) {
          localStorage.removeItem('vendor_token');
          localStorage.removeItem('vendor');
          window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { role: 'vendor' } }));
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { role: 'user' } }));
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
