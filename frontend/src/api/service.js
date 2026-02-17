import apiClient from './client';

export const serviceApi = {
  createTicket: (formData) =>
    apiClient.post('/service/tickets', formData, {
      headers: { 'Content-Type': undefined },
    }),
  getTickets: (params) => apiClient.get('/service/tickets', { params }),
  getAllTickets: (params) => apiClient.get('/service/tickets/all', { params }),
  getAdminTickets: (params) => apiClient.get('/service/tickets/admin', { params }),
  getActiveChats: () => apiClient.get('/service/tickets/active-chats'),
  getTicket: (id) => apiClient.get(`/service/tickets/${id}`),
  updateTicketStatus: (id, status) => apiClient.put(`/service/tickets/${id}/status`, { status }),
  closeTicket: (id) => apiClient.put(`/service/tickets/${id}/close`),
  forwardTicket: (id, targetStaffId) => apiClient.put(`/service/tickets/${id}/forward`, { targetStaffId }),
  rateTicket: (id, rating, comment) => apiClient.post(`/service/tickets/${id}/rate`, { rating, comment }),
  getStaffRatings: (staffId) => apiClient.get(`/service/staff/${staffId}/ratings`),
  getAvailableStaff: (category) => apiClient.get('/service/staff/available', { params: { category } }),
  getChatMessages: (ticketId, params) => apiClient.get(`/service/tickets/${ticketId}/chat`, { params }),
  sendChatMessage: (ticketId, formData) =>
    apiClient.post(`/service/tickets/${ticketId}/chat`, formData, {
      headers: { 'Content-Type': undefined },
    }),
  editMessage: (id, message) => apiClient.put(`/service/messages/${id}`, { message }),
  deleteMessage: (id) => apiClient.delete(`/service/messages/${id}`),
  confirmAppointment: (ticketId, date) =>
    apiClient.post(`/service/tickets/${ticketId}/confirm-appointment`, { date }),
  assignTicket: (ticketId, staffId) =>
    apiClient.put(`/service/tickets/${ticketId}/assign`, { staffId }),
};
