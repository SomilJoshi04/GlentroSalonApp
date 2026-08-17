import api from './axiosInstance';

export const registerUser = (data) => api.post('/auth/register/user', data);
export const loginUser = (data) => api.post('/auth/login/user', data);
export const getProfile = (token) => api.get('/auth/profile', token ? { headers: { Authorization: `Bearer ${token}` } } : {});
export const updateProfile = (data) => api.put('/users/profile', data);
export const updateLocation = (data) => api.put('/users/location', data);
export const updateFcmToken = (data) => api.put('/users/fcm-token', data);
