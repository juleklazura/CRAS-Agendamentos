/**
 * useModal - Hook para gerenciamento de modais
 * 
 * Simplifica controle de estado de modais
 * 
 * @module hooks/useModal
 */

import { useState, useCallback } from 'react';

export default function useModal(initialData = null) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState(initialData);

  /**
   * Abre o modal com dados opcionais
   */
  const openModal = useCallback((modalData = null) => {
    if (modalData) {
      setData(modalData);
    }
    setIsOpen(true);
  }, []);

  /**
   * Fecha o modal e limpa dados
   */
  const closeModal = useCallback(() => {
    setIsOpen(false);
    setData(null);
  }, []);

  /**
   * Atualiza dados do modal
   */
  const updateData = useCallback((newData) => {
    setData(prev => ({ ...prev, ...newData }));
  }, []);

  /**
   * Toggle do modal
   */
  const toggleModal = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    isOpen,
    data,
    openModal,
    closeModal,
    updateData,
    toggleModal
  };
}
