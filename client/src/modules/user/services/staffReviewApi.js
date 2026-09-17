import api from '../../../services/api/axiosInstance';

/**
 * Staff Review API
 *
 * Staff review submission: POST /api/bookings/:bookingId/staff-review
 * Staff reviews (public): GET /api/staff/:staffId/reviews
 * Top stylists (public):  GET /api/salons/:salonId/top-stylists
 */

/**
 * Submit a staff review for a specific service within a completed booking.
 * @param {string} bookingId - The booking ID
 * @param {Object} data - { bookingServiceId, staffId, rating (1-5), review (optional) }
 */
export const submitStaffReview = (bookingId, data) =>
  api.post(`/bookings/${bookingId}/staff-review`, data);

/**
 * Get non-hidden reviews for a specific staff member.
 * @param {string} staffId
 * @param {Object} params - { page, limit }
 */
export const getStaffReviews = (staffId, params) =>
  api.get(`/staff/${staffId}/reviews`, { params });

/**
 * Get top stylists for a salon, ranked by Wilson Score.
 * @param {string} salonId
 */
export const getTopStylists = (salonId) =>
  api.get(`/salons/${salonId}/top-stylists`);
