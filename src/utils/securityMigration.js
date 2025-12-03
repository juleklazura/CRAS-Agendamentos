/**
 * Script de Migração de Segurança
 * 
 * Este script deve ser executado UMA VEZ após o deploy da correção de segurança
 * para limpar tokens antigos do localStorage dos usuários.
 * 
 * Adicione este script em um useEffect no App.jsx ou rode manualmente.
 */

import { useEffect, useRef } from 'react';

export function migrateSecurityLocalStorage() {
  try {
    // Verifica se há token antigo no localStorage
    const oldToken = localStorage.getItem('token');
    const oldUser = localStorage.getItem('user');
    
    if (oldToken || oldUser) {
      console.warn('🔒 Migração de Segurança: Removendo tokens antigos do localStorage');
      
      // Remove dados sensíveis
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Opcional: manter configurações de UI que não são sensíveis
      // localStorage.removeItem('theme'); // NÃO remover
      // localStorage.removeItem('language'); // NÃO remover
      
      console.info('✅ Migração concluída: tokens removidos com sucesso');
      
      // Força reautenticação
      console.info('ℹ️ Por favor, faça login novamente para continuar');
      
      return true; // Indica que migração foi necessária
    }
    
    return false; // Nenhuma migração necessária
  } catch (error) {
    console.error('❌ Erro na migração de segurança:', error);
    return false;
  }
}

/**
 * Hook para executar migração automaticamente
 * Use no App.jsx ou componente raiz
 */
export function useMigrateSecurityLocalStorage() {
  const migrated = useRef(false);
  
  useEffect(() => {
    if (!migrated.current) {
      const needsMigration = migrateSecurityLocalStorage();
      
      if (needsMigration) {
        // Redirecionar para login
        window.location.href = '/login';
      }
      
      migrated.current = true;
    }
  }, []);
}

/**
 * Para executar manualmente no console do navegador:
 * 
 * 1. Abra DevTools (F12)
 * 2. Vá para a aba Console
 * 3. Cole e execute:
 * 
 * localStorage.removeItem('token');
 * localStorage.removeItem('user');
 * console.log('Tokens removidos. Faça login novamente.');
 * window.location.href = '/login';
 */
