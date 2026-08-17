import api from '../../../services/api/axiosInstance';

export const getDashboardStats = () => api.get('/admin/dashboard');

export const getRecentBookings = () => api.get('/admin/recent-bookings');

export const getBookingStats = () => api.get('/admin/booking-stats');

export const getPendingCounts = () => api.get('/admin/pending-counts');

// User Management
export const getUsers = (params) => api.get('/admin/users', { params });
export const updateUserStatus = (id, isActive) => api.put(`/admin/users/${id}/status`, { isActive });

// Note: Add Categories, Services, Packages, etc. here as needed

// Vendor Management
export const getVendors = (params) => api.get('/admin/vendors', { params });
export const updateVendorStatus = (id, statusData) => api.put(`/admin/vendors/${id}/status`, statusData);

// Auth & Profile
export const loginAdmin = (data) => api.post('/auth/login/admin', data);
export const getProfile = () => api.get('/auth/profile');

// Salons
export const getAllSalons = (params) => api.get('/admin/salons', { params });

// Bookings
export const getAllBookings = (params) => api.get('/admin/bookings', { params });

// Categories
export const getCategories = (params) => api.get('/admin/categories', { params });
export const createCategory = (data) => api.post('/admin/categories', data, { headers: { 'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json' }});
export const deleteCategory = (id) => api.delete(`/admin/categories/${id}`);
export const getSubcategories = (params) => api.get('/admin/subcategories', { params });
export const createSubcategory = (data) => api.post('/admin/subcategories', data);
export const deleteSubcategory = (id) => api.delete(`/admin/subcategories/${id}`);

// Services
export const getServices = (params) => api.get('/admin/services', { params });

// Commissions
export const getCommissions = (params) => api.get('/admin/commissions', { params });
export const setCommission = (data) => api.post('/admin/commissions', data);
export const getPlatformFee = () => api.get('/admin/platform-fee');
export const updatePlatformFee = (data) => api.put('/admin/platform-fee', data);

// Coupons
export const getCoupons = (params) => api.get('/admin/coupons', { params });
export const createCoupon = (data) => api.post('/admin/coupons', data);
export const deleteCoupon = (id) => api.delete(`/admin/coupons/${id}`);

// Offers & Packages
export const getOffers = (params) => api.get('/offers', { params });
export const approveOffer = (id) => api.patch(`/offers/${id}/approve`);
export const rejectOffer = (id, data) => api.patch(`/offers/${id}/reject`, data);

export const getPackages = (params) => api.get('/packages', { params });
export const approvePackage = (id) => api.patch(`/packages/${id}/approve`);
export const rejectPackage = (id, data) => api.patch(`/packages/${id}/reject`, data);

// Subscriptions
export const getSubscriptionPlans = (params) => api.get('/admin/subscriptions/plans', { params });
export const createSubscriptionPlan = (data) => api.post('/admin/subscriptions/plans', data);
export const updateSubscriptionPlan = (id, data) => api.put(`/admin/subscriptions/plans/${id}`, data);
export const assignSubscription = (vendorId, planId) => api.post(`/admin/subscriptions/assign`, { vendorId, planId });
  
// Banners
export const getBanners = () => api.get('/banners');
export const createBanner = (formData) => api.post('/banners', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateBanner = (id, formData) => api.put(`/banners/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteBanner = (id) => api.delete(`/banners/${id}`);
export const toggleBannerStatus = (id) => api.patch(`/banners/${id}/toggle-status`);
