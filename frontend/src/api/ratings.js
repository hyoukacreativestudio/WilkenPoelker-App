import apiClient from './client';

export const ratingsApi = {
  createServiceRating: (data) => apiClient.post('/ratings/service', data),
  createStaffRating: (staffId, data) => apiClient.post(`/ratings/staff/${staffId}`, data),
  getServiceStats: () => apiClient.get('/ratings/service/stats'),
  getProductStats: (productId) => apiClient.get(`/ratings/product/${productId}/stats`),
  voteHelpful: (reviewId) => apiClient.post(`/ratings/reviews/${reviewId}/helpful`),
};
