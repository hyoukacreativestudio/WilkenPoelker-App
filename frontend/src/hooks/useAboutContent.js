import { useState, useEffect, useCallback, useRef } from 'react';
import { aboutApi } from '../api/about';
import { useAuth } from './useAuth';
import { useToast } from '../components/ui/Toast';
import { DEFAULTS } from '../screens/about/defaults';

export function useAboutContent(section) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [content, setContent] = useState(DEFAULTS[section] || {});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Synchronous mirror of content state for use in saveAllChanges
  const contentRef = useRef(content);

  // Track which keys have been modified locally but not yet saved to API
  const pendingKeysRef = useRef(new Set());

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // Fetch content from API
  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await aboutApi.getSection(section);
      if (response?.data && Object.keys(response.data).length > 0) {
        setContent((prev) => {
          const merged = { ...prev, ...response.data };
          contentRef.current = merged;
          return merged;
        });
      }
    } catch (err) {
      // Keep defaults on error - app works without backend
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Update a content key LOCALLY only (no API call)
  const updateContent = useCallback((contentKey, newContent) => {
    setContent((prev) => {
      const updated = { ...prev, [contentKey]: newContent };
      contentRef.current = updated;
      return updated;
    });
    pendingKeysRef.current.add(contentKey);
  }, []);

  // Save ALL pending changes to API at once
  const saveAllChanges = useCallback(async () => {
    const pendingKeys = Array.from(pendingKeysRef.current);
    if (pendingKeys.length === 0) return true;

    try {
      setSaving(true);

      // Use the synchronous ref to get current content
      const snapshot = contentRef.current;

      // Save each pending key to API
      const promises = pendingKeys.map((key) =>
        aboutApi.updateContentKey(section, key, snapshot[key])
      );
      await Promise.all(promises);

      // Clear pending keys on success
      pendingKeysRef.current.clear();
      showToast({ type: 'success', message: 'Änderungen gespeichert' });
      return true;
    } catch (err) {
      showToast({ type: 'error', message: 'Änderungen konnten nicht gespeichert werden.' });
      return false;
    } finally {
      setSaving(false);
    }
  }, [section, showToast]);

  // Discard pending changes and reload from API
  const discardChanges = useCallback(() => {
    pendingKeysRef.current.clear();
    fetchContent();
  }, [fetchContent]);

  // Upload an image (this still calls API immediately - uploads are not deferred)
  // webBlob: optional pre-fetched Blob for web (avoids re-fetching a potentially revoked blob: URI)
  const uploadImage = useCallback(async (imageUri, webBlob = null) => {
    try {
      setSaving(true);
      const result = await aboutApi.uploadImage(imageUri, webBlob);
      return result.url; // e.g. "/uploads/uuid_filename.jpg"
    } catch (err) {
      showToast({ type: 'error', message: 'Bild konnte nicht hochgeladen werden.' });
      return null;
    } finally {
      setSaving(false);
    }
  }, [showToast]);

  // Delete an uploaded image
  const deleteImage = useCallback(async (imageUrl) => {
    try {
      if (!imageUrl || !imageUrl.startsWith('/uploads/')) return;
      const filename = imageUrl.split('/').pop();
      await aboutApi.deleteImage(filename);
    } catch (err) {
      // deletion failed silently
    }
  }, []);

  const hasPendingChanges = pendingKeysRef.current.size > 0;

  return {
    content,
    loading,
    saving,
    error,
    isAdmin,
    updateContent,
    saveAllChanges,
    discardChanges,
    hasPendingChanges,
    uploadImage,
    deleteImage,
    refetch: fetchContent,
  };
}
