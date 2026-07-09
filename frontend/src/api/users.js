import apiClient from './client';
import { uploadPost } from '../utils/fetchUpload';

export const usersApi = {
  getProfile: () => apiClient.get('/users/profile'),
  updateProfile: (data) => apiClient.put('/users/profile', data),
  // Avatar upload goes through native fetch — axios + FormData on release
  // Android otherwise fails with a bare "Network Error" before the request fires.
  uploadAvatar: (formData) => uploadPost('PUT', '/users/avatar', formData),
  changePassword: (data) => apiClient.put('/users/password', data),
  exportMyData: () => apiClient.get('/users/export'),

  // Admin
  getUsers: (params) => apiClient.get('/users/admin/list', { params }),
  getUserDetail: (id) => apiClient.get(`/users/admin/${id}`),
  updateUserRole: (id, role) => apiClient.put(`/users/admin/${id}/role`, { role }),
  updateUserPermissions: (id, permissions) =>
    apiClient.put(`/users/admin/${id}/permissions`, { permissions }),
  deactivateUser: (id) => apiClient.put(`/users/admin/${id}/deactivate`),
  getAuditLog: (params) => apiClient.get('/users/admin/audit-log', { params }),
};
