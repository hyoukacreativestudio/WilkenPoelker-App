import apiClient from './client';

export const customerNumberApi = {
  // Customer: create a request
  createRequest: (data) => apiClient.post('/customer-number/request', data),

  // Customer: get my request status
  getMyRequest: () => apiClient.get('/customer-number/request/my'),

  // Admin: get all requests
  getAllRequests: (status = 'pending') => apiClient.get(`/customer-number/requests?status=${status}`),

  // Admin: approve a request
  approveRequest: (id, customerNumber) =>
    apiClient.put(`/customer-number/requests/${id}/approve`, { customerNumber }),

  // Admin: reject a request
  rejectRequest: (id, note) =>
    apiClient.put(`/customer-number/requests/${id}/reject`, { note }),
};
