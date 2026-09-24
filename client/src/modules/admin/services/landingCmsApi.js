import api from '../../../services/api/axiosInstance';

// Public & Preview
export const getPublicLandingPage = () => api.get('/landing/public');
export const getPreviewLandingPage = () => api.get('/landing/preview');

// CMS Config & State
export const getCmsConfig = () => api.get('/landing/admin/config');
export const updateCmsConfig = (data) => api.put('/landing/admin/config', data);
export const uploadCmsMedia = (formData) =>
  api.post('/landing/admin/media-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const publishCmsConfig = () => api.patch('/landing/admin/publish');

// Banners
export const createBanner = (formData) =>
  api.post('/landing/admin/banners', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const updateBanner = (id, formData) =>
  api.put(`/landing/admin/banners/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const deleteBanner = (id) => api.delete(`/landing/admin/banners/${id}`);
export const toggleBannerStatus = (id) => api.patch(`/landing/admin/banners/${id}/status`);
export const reorderBanners = (orders) => api.patch('/landing/admin/banners/reorder', { orders });

// Guide Videos
export const createVideo = (formData) =>
  api.post('/landing/admin/videos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const updateVideo = (id, formData) =>
  api.put(`/landing/admin/videos/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const deleteVideo = (id) => api.delete(`/landing/admin/videos/${id}`);
export const toggleVideoStatus = (id) => api.patch(`/landing/admin/videos/${id}/status`);

// Features
export const createFeature = (data) => api.post('/landing/admin/features', data);
export const updateFeature = (id, data) => api.put(`/landing/admin/features/${id}`, data);
export const deleteFeature = (id) => api.delete(`/landing/admin/features/${id}`);

// How It Works (Steps)
export const createStep = (data) => api.post('/landing/admin/steps', data);
export const updateStep = (id, data) => api.put(`/landing/admin/steps/${id}`, data);
export const deleteStep = (id) => api.delete(`/landing/admin/steps/${id}`);

// Testimonials
export const createTestimonial = (formData) =>
  api.post('/landing/admin/testimonials', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const updateTestimonial = (id, formData) =>
  api.put(`/landing/admin/testimonials/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const deleteTestimonial = (id) => api.delete(`/landing/admin/testimonials/${id}`);

// Stats
export const saveStats = (stats) => api.put('/landing/admin/stats', { stats });
