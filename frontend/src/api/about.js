import apiClient, { getServerUrl } from './client';

export const aboutApi = {
  // Get all content for a section (public)
  getSection: async (section) => {
    const response = await apiClient.get(`/about/${section}`);
    return response.data;
  },

  // Update a specific content key (admin)
  updateContentKey: async (section, contentKey, content) => {
    const response = await apiClient.put(`/about/${section}/${contentKey}`, { content });
    return response.data;
  },

  // Upload an image (admin)
  uploadImage: async (imageUri) => {
    const formData = new FormData();
    const name = imageUri.split('/').pop() || 'photo.jpg';
    const ext = name.split('.').pop()?.toLowerCase();
    const mimeMap = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };

    formData.append('image', {
      uri: imageUri,
      name,
      type: mimeMap[ext] || 'image/jpeg',
    });

    const response = await apiClient.post('/about/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Delete an uploaded image (admin)
  deleteImage: async (filename) => {
    const response = await apiClient.delete(`/about/upload/${filename}`);
    return response.data;
  },

  // Get full image URL from a path
  getImageUrl: (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/uploads/')) {
      return `${getServerUrl()}${imagePath}`;
    }
    return imagePath;
  },
};

export default aboutApi;
