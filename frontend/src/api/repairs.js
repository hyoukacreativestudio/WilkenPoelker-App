import apiClient from './client';

export const repairsApi = {
  getRepairs: (params) => apiClient.get('/repairs', { params }),
  getAllRepairs: (params) => apiClient.get('/repairs/all', { params }),
  getRepair: (id) => apiClient.get(`/repairs/${id}`),
  getRepairStatus: (id) => apiClient.get(`/repairs/${id}/status`),
  requestRepair: (data) => apiClient.post('/repairs', data),
  updateStatus: (id, data) => apiClient.put(`/repairs/${id}/status`, data),
  getInvoice: (id) => apiClient.get(`/repairs/${id}/invoice`),
  createReview: (id, data) => apiClient.post(`/repairs/${id}/review`, data),
  acknowledgeRepair: (id) => apiClient.post(`/repairs/${id}/acknowledge`),
};
