import { useState, useCallback, useRef } from 'react';

export function usePagination(apiFunc, limit = 20) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const pageRef = useRef(1);

  const fetchItems = useCallback(async (params = {}, reset = false) => {
    if (loading && !reset) return;

    if (reset) {
      pageRef.current = 1;
      setHasMore(true);
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiFunc({
        page: pageRef.current,
        limit,
        ...params,
      });

      const innerData = result.data?.data || {};
      let rawItems = innerData?.items || innerData?.posts || innerData?.tickets || innerData?.appointments || innerData?.notifications || innerData?.repairs || innerData?.products || (Array.isArray(innerData) ? innerData : []);
      if (!rawItems || (Array.isArray(rawItems) && rawItems.length === 0)) {
        // Fallback: find first array value in innerData
        const firstArray = Object.values(innerData).find(v => Array.isArray(v));
        if (firstArray) rawItems = firstArray;
      }
      const newItems = Array.isArray(rawItems) ? rawItems : [];
      const total = innerData?.total || innerData?.pagination?.total || 0;

      if (reset) {
        setItems(newItems);
      } else {
        setItems((prev) => [...prev, ...newItems]);
      }

      const moreAvailable = innerData?.hasMore !== undefined ? innerData.hasMore : newItems.length === limit;
      setHasMore(moreAvailable);
      pageRef.current += 1;

      return { items: newItems, total };
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiFunc, limit, loading]);

  const refresh = useCallback(async (params = {}) => {
    setRefreshing(true);
    await fetchItems(params, true);
  }, [fetchItems]);

  const loadMore = useCallback(async (params = {}) => {
    if (!hasMore || loading) return;
    await fetchItems(params);
  }, [fetchItems, hasMore, loading]);

  const reset = useCallback(() => {
    setItems([]);
    setLoading(false);
    setRefreshing(false);
    setHasMore(true);
    setError(null);
    pageRef.current = 1;
  }, []);

  return {
    items,
    loading,
    refreshing,
    hasMore,
    error,
    fetchItems: (params) => fetchItems(params, true),
    loadMore,
    refresh,
    reset,
    setItems,
  };
}
