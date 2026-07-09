import apiClient from './client';
import { uploadPost } from '../utils/fetchUpload';

export const feedApi = {
  getPosts: (params) => apiClient.get('/feed', { params }),
  getPost: (id) => apiClient.get(`/feed/${id}`),
  // Multipart uploads bypass axios and go through native fetch (RN + axios +
  // FormData on release Android is fragile and manifests as "Network Error").
  // Plain object payloads for text-only posts still go through axios.
  createPost: (payload) => {
    if (payload instanceof FormData) return uploadPost('POST', '/feed', payload);
    return apiClient.post('/feed', payload);
  },
  updatePost: (id, data) => apiClient.put(`/feed/${id}`, data),
  deletePost: (id) => apiClient.delete(`/feed/${id}`),
  likePost: (id) => apiClient.post(`/feed/${id}/like`),
  addComment: (id, content) => apiClient.post(`/feed/${id}/comment`, { content }),
  getComments: (id, params) => apiClient.get(`/feed/${id}/comments`, { params }),
  deleteComment: (id) => apiClient.delete(`/feed/comments/${id}`),
  reportPost: (id, reason) => apiClient.post(`/feed/${id}/report`, { reason }),
  sharePost: (id, channel) => apiClient.post(`/feed/${id}/share`, { channel }),
};
