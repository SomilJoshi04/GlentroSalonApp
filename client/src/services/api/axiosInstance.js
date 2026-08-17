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
      // Clear token and redirect based on which request failed
      if (url.includes('/admin/')) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin');
        if (!window.location.pathname.includes('/admin/login')) window.location.href = '/admin/login';
      } else if (url.includes('/vendor') || url.includes('/vendors/profile') || url.includes('/salons/vendor/')) {
        localStorage.removeItem('vendor_token');
        localStorage.removeItem('vendor');
        if (!window.location.pathname.includes('/vendor/login')) window.location.href = '/vendor/login';
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('/login') && !window.location.pathname.startsWith('/admin') && !window.location.pathname.startsWith('/vendor')) {
           window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
