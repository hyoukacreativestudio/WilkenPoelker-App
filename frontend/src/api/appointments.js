import apiClient from './client';

export const appointmentsApi = {
  getAppointments: (params) => apiClient.get('/appointments', { params }),
  getAppointmentRequests: (params) => apiClient.get('/appointments/requests', { params }),
  getOngoingAppointments: (params) => apiClient.get('/appointments/ongoing', { params }),
  createAppointment: (data) => apiClient.post('/appointments', data),
  getAppointment: (id) => apiClient.get(`/appointments/${id}`),
  reschedule: (id, data) => apiClient.put(`/appointments/${id}`, data),
  cancel: (id, reason) => apiClient.delete(`/appointments/${id}`, { data: { cancelReason: reason } }),
  confirm: (id) => apiClient.post(`/appointments/${id}/confirm`),
  proposeTime: (id, data) => apiClient.post(`/appointments/${id}/propose`, data),
  respondToProposal: (id, data) => apiClient.post(`/appointments/${id}/respond`, data),
  getIcal: (id) => apiClient.get(`/appointments/${id}/ical`),
  getUnregisteredAppointments: (params) => apiClient.get('/appointments/unregistered', { params }),
  registerAppointment: (id) => apiClient.post(`/appointments/${id}/register`),
  askQuestion: (id, question) => apiClient.post(`/appointments/${id}/question`, { question }),
  answerQuestion: (id, answer) => apiClient.post(`/appointments/${id}/answer`, { answer }),
};
