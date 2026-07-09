import { Platform } from 'react-native';
import apiClient from './client';
import { uploadPost } from '../utils/fetchUpload';

export const aiApi = {
  chat: async (data, imagesParam = []) => {
    const images = data.images || imagesParam;
    if (images && images.length > 0) {
      const formData = new FormData();
      formData.append('category', data.category);
      formData.append('message', data.message);
      if (data.sessionId) formData.append('sessionId', data.sessionId);

      for (let index = 0; index < images.length; index++) {
        const img = images[index];
        const name = img.fileName || `image_${index}.jpg`;
        const type = img.mimeType || 'image/jpeg';
        if (Platform.OS === 'web') {
          const webFile = img.file || img._webFile;
          if (webFile) formData.append('images', webFile, name);
        } else {
          formData.append('images', { uri: img.uri, name, type });
        }
      }
      // Route through native fetch — axios+FormData breaks on Android release APKs
      return uploadPost('POST', '/ai/chat', formData);
    }
    return apiClient.post('/ai/chat', data);
  },
  getSessions: () => apiClient.get('/ai/sessions'),
  getSession: (id) => apiClient.get(`/ai/sessions/${id}`),
  escalate: (sessionId) => apiClient.post(`/ai/sessions/${sessionId}/escalate`),
};
