import apiClient from './client';

export const settingsApi = {
  getOpeningHours: async () => {
    const response = await apiClient.get('/settings/opening-hours');
    return response.data?.data ?? response.data;
  },
  getOpeningStatus: async () => {
    const response = await apiClient.get('/settings/opening-hours/status');
    return response.data?.data ?? response.data;
  },
  getHolidays: async () => {
    const response = await apiClient.get('/settings/holidays');
    return response.data?.data ?? response.data;
  },
  updateOpeningHours: async (data) => {
    const response = await apiClient.put('/settings/opening-hours', data);
    return response.data?.data ?? response.data;
  },
  addHoliday: async (data) => {
    const response = await apiClient.post('/settings/holidays', data);
    return response.data?.data ?? response.data;
  },
  removeHoliday: async (id) => {
    const response = await apiClient.delete(`/settings/holidays/${id}`);
    return response.data?.data ?? response.data;
  },
};
