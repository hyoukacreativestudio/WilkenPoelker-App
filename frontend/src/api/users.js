import apiClient from './client';

export const usersApi = {
  getProfile: () => apiClient.get('/users/profile'),
  updateProfile: (data) => apiClient.put('/users/profile', data),
  // Do NOT set Content-Type explicitly — axios already detects FormData and the
  // request interceptor strips Content-Type so the boundary parameter is added
  // by the underlying transport. Setting it to undefined breaks on web/axios.
  uploadAvatar: (formData) => apiClient.put('/users/avatar', formData),
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
