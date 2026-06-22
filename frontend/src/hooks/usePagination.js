import { useState, useCallback, useRef } from 'react';

export function usePagination(apiFunc, limit = 20) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const pageRef = useRef(1);
  const cursorRef = useRef(null);
  // Synchronous lock so rapid onEndReached firings don't double-fetch
  const loadingRef = useRef(false);

  const fetchItems = useCallback(async (params = {}, reset = false) => {
    if (loadingRef.current && !reset) return;

    if (reset) {
      pageRef.current = 1;
      cursorRef.current = null;
      setHasMore(true);
    }

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const requestParams = {
        page: pageRef.current,
        limit,
        ...params,
      };

      // Add cursor for cursor-based pagination (feed uses this)
      if (cursorRef.current && !reset) {
        requestParams.cursor = cursorRef.current;
      }

      const result = await apiFunc(requestParams);

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

      // Support cursor-based pagination (nextCursor from feed API)
      if (innerData?.nextCursor !== undefined) {
        cursorRef.current = innerData.nextCursor;
      }

      const moreAvailable = innerData?.hasMore !== undefined ? innerData.hasMore : newItems.length === limit;
      setHasMore(moreAvailable);
      // Only advance the page counter when we actually got items, so a failed/empty
      // first call doesn't skip page 2.
      if (newItems.length > 0) {
        pageRef.current += 1;
      }

      return { items: newItems, total };
    } catch (err) {
      setError(err);
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiFunc, limit]);

  const refresh = useCallback(async (params = {}) => {
    setRefreshing(true);
    await fetchItems(params, true);
  }, [fetchItems]);

  const loadMore = useCallback(async (params = {}) => {
    if (!hasMore || loadingRef.current) return;
    await fetchItems(params);
  }, [fetchItems, hasMore]);

  const reset = useCallback(() => {
    setItems([]);
    loadingRef.current = false;
    setLoading(false);
    setRefreshing(false);
    setHasMore(true);
    setError(null);
    pageRef.current = 1;
    cursorRef.current = null;
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
