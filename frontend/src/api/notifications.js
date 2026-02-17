import apiClient from './client';

export const notificationsApi = {
  getNotifications: (params) => apiClient.get('/notifications', { params }),
  markAsRead: (id) => apiClient.put(`/notifications/${id}/read`),
  markAllAsRead: () => apiClient.put('/notifications/read-all'),
  deleteNotification: (id) => apiClient.delete(`/notifications/${id}`),
  deleteAll: () => apiClient.delete('/notifications/all?confirm=true'),
  registerFcmToken: (token, platform) => apiClient.post('/notifications/fcm-token', { token, platform }),
  removeFcmToken: (token) => apiClient.delete('/notifications/fcm-token', { data: { token } }),
  sendBroadcast: (data) => apiClient.post('/notifications/send', data),
  getUnreadCount: () => apiClient.get('/notifications/unread-count'),
};
