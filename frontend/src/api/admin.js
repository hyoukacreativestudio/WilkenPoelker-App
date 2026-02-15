import apiClient from './client';

export const adminApi = {
  getDashboard: () => apiClient.get('/admin/dashboard'),
  getUsers: (params) => apiClient.get('/admin/users', { params }),
  getAuditLog: (params) => apiClient.get('/admin/audit-log', { params }),
  sendBroadcast: (data) => apiClient.post('/admin/broadcast', data),
  getAnalytics: () => apiClient.get('/admin/analytics'),
  getYearlyOverview: (year) => apiClient.get('/admin/yearly-overview', { params: { year } }),
  changeUserRole: (userId, role) => apiClient.put(`/users/admin/${userId}/role`, { role }),
  updatePermissions: (userId, permissions) => apiClient.put(`/users/admin/${userId}/permissions`, { permissions }),
  sendDirectMessage: (userId, data) => apiClient.post(`/admin/users/${userId}/message`, data),
};
