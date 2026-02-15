import client from './client';

export const faqApi = {
  getFAQs: async (category) => {
    const params = category ? { category } : {};
    const response = await client.get('/faq', { params });
    return response.data;
  },

  getAllFAQs: async () => {
    const response = await client.get('/faq/all');
    return response.data;
  },

  createFAQ: async (data) => {
    const response = await client.post('/faq', data);
    return response.data;
  },

  updateFAQ: async (id, data) => {
    const response = await client.put(`/faq/${id}`, data);
    return response.data;
  },

  deleteFAQ: async (id) => {
    const response = await client.delete(`/faq/${id}`);
    return response.data;
  },
};
