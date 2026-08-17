import axiosInstance from './axiosInstance';

export const getSettings = () => axiosInstance.get('/settings');

export const updateAppLogo = (formData) => 
  axiosInstance.put('/settings/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const updateAppName = (name) => 
  axiosInstance.put('/settings/name', { name });
