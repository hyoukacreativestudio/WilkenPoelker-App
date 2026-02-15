import apiClient from './client';

export const productsApi = {
  getProducts: (params) => apiClient.get('/products', { params }),
  getOffers: () => apiClient.get('/products/offers'),
  searchProducts: (query) => apiClient.get('/products/search', { params: { q: query } }),
  getByCategory: (category, params) => apiClient.get(`/products/categories/${category}`, { params }),
  getProduct: (id) => apiClient.get(`/products/${id}`),
  getReviews: (id, params) => apiClient.get(`/products/${id}/reviews`, { params }),
  createReview: (id, data) => apiClient.post(`/products/${id}/review`, data),
  updateReview: (id, data) => apiClient.put(`/products/reviews/${id}`, data),
  deleteReview: (id) => apiClient.delete(`/products/reviews/${id}`),
  toggleFavorite: (id) => apiClient.post(`/products/${id}/favorite`),
  getFavorites: (params) => apiClient.get('/products/favorites', { params }),
  trackShare: (id, channel) => apiClient.post(`/products/${id}/share`, { channel }),
  getShareMetadata: (id) => apiClient.get(`/products/${id}/share-metadata`),
};
