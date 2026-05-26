import { useState, useCallback } from 'react';

interface PaginationState {
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface UsePaginationOptions {
  initialPage?: number;
  initialLimit?: number;
}

export function usePagination({ initialPage = 1, initialLimit = 20 }: UsePaginationOptions = {}) {
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [totalPages, setTotalPages] = useState(1);

  const goTo = useCallback((p: number) => {
    setPage(Math.max(1, p));
  }, []);

  const next = useCallback(() => goTo(page + 1), [page, goTo]);
  const prev = useCallback(() => goTo(page - 1), [page, goTo]);
  const reset = useCallback(() => setPage(1), []);

  const updateFromMeta = useCallback((meta: { totalPages: number; total: number }) => {
    setTotalPages(meta.totalPages);
  }, []);

  const state: PaginationState = {
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };

  return { ...state, goTo, next, prev, reset, updateFromMeta };
}
