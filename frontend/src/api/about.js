import { Platform } from 'react-native';
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
  // webBlob: optional pre-fetched Blob for web (avoids re-fetching a potentially revoked blob: URI)
  uploadImage: async (imageUri, webBlob = null) => {
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

    if (Platform.OS === 'web') {
      // Use pre-fetched blob if available, otherwise fetch from URI
      const blob = webBlob || (await fetch(imageUri).then((r) => r.blob()));
      const file = new File([blob], name, {
        type: blob.type || mimeMap[ext] || 'image/jpeg',
      });
      formData.append('image', file);
    } else {
      formData.append('image', {
        uri: imageUri,
        name,
        type: mimeMap[ext] || 'image/jpeg',
      });
    }

    const response = await apiClient.post('/about/upload', formData, {
      headers: { 'Content-Type': undefined },
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
