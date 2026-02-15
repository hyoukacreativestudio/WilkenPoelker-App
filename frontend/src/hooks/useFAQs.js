import { useState, useEffect, useCallback } from 'react';
import { faqApi } from '../api/faq';
import { useAuth } from './useAuth';
import { useToast } from '../components/ui/Toast';

// Same mapping as backend ROLE_CATEGORY_MAP
const ROLE_CATEGORY_MAP = {
  admin: null, // null = all categories
  super_admin: null,
  service_manager: ['general', 'bike', 'cleaning', 'motor', 'service'],
  bike_manager: ['bike'],
  cleaning_manager: ['cleaning'],
  motor_manager: ['motor'],
  robby_manager: ['motor'],
};

/**
 * Hook for loading and managing FAQs for a specific category.
 * Provides CRUD operations and role-based canEdit flag.
 *
 * @param {string} category - FAQ category to load ('bike', 'cleaning', 'motor', 'service', 'general')
 */
export function useFAQs(category) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Calculate if user can edit FAQs in this category
  const canEdit = (() => {
    if (!user) return false;
    const allowedCategories = ROLE_CATEGORY_MAP[user.role];
    if (allowedCategories === null) return true; // admin, super_admin
    if (allowedCategories === undefined) return false; // customer, etc.
    return allowedCategories.includes(category);
  })();

  // Fetch FAQs for this category
  const fetchFAQs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await faqApi.getFAQs(category);
      setFaqs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(`Error fetching FAQs for ${category}:`, err);
      setError(err.message || 'Could not load FAQs');
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchFAQs();
  }, [fetchFAQs]);

  // Create a new FAQ
  const createFAQ = useCallback(async ({ question, answer, order }) => {
    try {
      setSaving(true);
      const newFAQ = await faqApi.createFAQ({
        question,
        answer,
        category,
        order: order ?? faqs.length,
      });
      setFaqs((prev) => [...prev, newFAQ]);
      showToast({ type: 'success', message: 'FAQ erstellt' });
      return newFAQ;
    } catch (err) {
      console.error('Error creating FAQ:', err);
      showToast({ type: 'error', message: 'FAQ konnte nicht erstellt werden' });
      return null;
    } finally {
      setSaving(false);
    }
  }, [category, faqs.length, showToast]);

  // Update an existing FAQ
  const updateFAQ = useCallback(async (id, data) => {
    try {
      setSaving(true);
      const updated = await faqApi.updateFAQ(id, data);
      setFaqs((prev) => prev.map((f) => (f.id === id ? updated : f)));
      showToast({ type: 'success', message: 'FAQ aktualisiert' });
      return updated;
    } catch (err) {
      console.error('Error updating FAQ:', err);
      showToast({ type: 'error', message: 'FAQ konnte nicht aktualisiert werden' });
      return null;
    } finally {
      setSaving(false);
    }
  }, [showToast]);

  // Delete a FAQ
  const deleteFAQ = useCallback(async (id) => {
    try {
      setSaving(true);
      await faqApi.deleteFAQ(id);
      setFaqs((prev) => prev.filter((f) => f.id !== id));
      showToast({ type: 'success', message: 'FAQ gelöscht' });
      return true;
    } catch (err) {
      console.error('Error deleting FAQ:', err);
      showToast({ type: 'error', message: 'FAQ konnte nicht gelöscht werden' });
      return false;
    } finally {
      setSaving(false);
    }
  }, [showToast]);

  // Toggle active/inactive
  const toggleFAQ = useCallback(async (id) => {
    const faq = faqs.find((f) => f.id === id);
    if (!faq) return null;
    return updateFAQ(id, { isActive: !faq.isActive });
  }, [faqs, updateFAQ]);

  return {
    faqs,
    loading,
    saving,
    error,
    canEdit,
    createFAQ,
    updateFAQ,
    deleteFAQ,
    toggleFAQ,
    refresh: fetchFAQs,
  };
}
