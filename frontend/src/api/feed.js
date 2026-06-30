import apiClient from './client';

export const feedApi = {
  getPosts: (params) => apiClient.get('/feed', { params }),
  getPost: (id) => apiClient.get(`/feed/${id}`),
  // Let axios + request interceptor handle FormData Content-Type;
  // setting it to undefined breaks the multipart boundary on web.
  createPost: (formData) => apiClient.post('/feed', formData),
  updatePost: (id, data) => apiClient.put(`/feed/${id}`, data),
  deletePost: (id) => apiClient.delete(`/feed/${id}`),
  likePost: (id) => apiClient.post(`/feed/${id}/like`),
  addComment: (id, content) => apiClient.post(`/feed/${id}/comment`, { content }),
  getComments: (id, params) => apiClient.get(`/feed/${id}/comments`, { params }),
  deleteComment: (id) => apiClient.delete(`/feed/comments/${id}`),
  reportPost: (id, reason) => apiClient.post(`/feed/${id}/report`, { reason }),
  sharePost: (id, channel) => apiClient.post(`/feed/${id}/share`, { channel }),
};
