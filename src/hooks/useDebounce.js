/**
 * useDebounce - Hook para debounce de valores
 * 
 * Útil para busca em tempo real e otimização de performance
 * 
 * @module hooks/useDebounce
 */

import { useState, useEffect } from 'react';

export default function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Configura timeout para atualizar valor
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpa timeout se value ou delay mudarem
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
