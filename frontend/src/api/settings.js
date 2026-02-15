import apiClient from './client';

export const settingsApi = {
  getOpeningHours: () => apiClient.get('/settings/opening-hours'),
  getOpeningStatus: () => apiClient.get('/settings/opening-hours/status'),
  getHolidays: () => apiClient.get('/settings/holidays'),
  updateOpeningHours: (data) => apiClient.put('/settings/opening-hours', data),
  addHoliday: (data) => apiClient.post('/settings/holidays', data),
  removeHoliday: (id) => apiClient.delete(`/settings/holidays/${id}`),
};
