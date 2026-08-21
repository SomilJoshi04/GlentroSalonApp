import axiosInstance from './axiosInstance';

export const getSettings = () => axiosInstance.get('/settings');

export const updateAppLogo = (formData) => 
  axiosInstance.put('/settings/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const updateAppName = (name) => 
  axiosInstance.put('/settings/name', { name });

export const updateSearchRadius = (radius) =>
  axiosInstance.put('/settings/search-radius', { radius });

export const updateBulkSettings = (settings) =>
  axiosInstance.put('/settings/bulk', { settings });

export const updateLoginImage = (formData) =>
  axiosInstance.put('/settings/login-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const updateRegisterImage = (formData) =>
  axiosInstance.put('/settings/register-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
