/**
 * usePagination - Hook para gerenciamento de paginação
 * 
 * Simplifica lógica de paginação em tabelas
 * 
 * @module hooks/usePagination
 */

import { useState, useCallback, useMemo } from 'react';

export default function usePagination(initialPage = 1, initialPageSize = 10) {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [total, setTotal] = useState(0);

  /**
   * Total de páginas
   */
  const totalPages = useMemo(() => {
    return Math.ceil(total / pageSize);
  }, [total, pageSize]);

  /**
   * Vai para uma página específica
   */
  const goToPage = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  }, [totalPages]);

  /**
   * Vai para a próxima página
   */
  const nextPage = useCallback(() => {
    goToPage(page + 1);
  }, [page, goToPage]);

  /**
   * Vai para a página anterior
   */
  const previousPage = useCallback(() => {
    goToPage(page - 1);
  }, [page, goToPage]);

  /**
   * Muda o tamanho da página
   */
  const changePageSize = useCallback((newPageSize) => {
    setPageSize(newPageSize);
    setPage(1); // Reset para primeira página
  }, []);

  /**
   * Reset da paginação
   */
  const reset = useCallback(() => {
    setPage(initialPage);
    setPageSize(initialPageSize);
    setTotal(0);
  }, [initialPage, initialPageSize]);

  return {
    page,
    pageSize,
    total,
    totalPages,
    setTotal,
    goToPage,
    nextPage,
    previousPage,
    changePageSize,
    reset,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1
  };
}
