/**
 * ========================================
 * Hook useAuth - Autenticação Simplificada
 * ========================================
 * 
 * Hook customizado que abstrai o acesso ao AuthContext
 * Facilita o consumo de dados de autenticação em qualquer componente
 * Implementa validação de contexto para prevenir erros de runtime
 * 
 * FUNCIONALIDADES:
 * - Acesso centralizado aos dados do usuário autenticado
 * - Funções de login e logout com controle de sessão
 * - Validação automática de contexto provider
 * - Proteção contra uso fora do AuthProvider
 * 
 * COMO USAR:
 * ```jsx
 * import { useAuth } from '../hooks/useAuth';
 * 
 * function MeuComponente() {
 *   const { user, login, logout, isAuthenticated } = useAuth();
 *   
 *   return (
 *     <div>
 *       {isAuthenticated ? (
 *         <p>Bem-vindo, {user.name}!</p>
 *       ) : (
 *         <button onClick={() => login(credentials)}>Login</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 * 
 * RETORNO DO HOOK:
 * @returns {Object} contextValue - Valor completo do AuthContext
 * @returns {Object} contextValue.user - Dados do usuário autenticado (name, email, role, cras)
 * @returns {boolean} contextValue.isAuthenticated - Status de autenticação (true/false)
 * @returns {Function} contextValue.login - Função para fazer login (credentials) => Promise
 * @returns {Function} contextValue.logout - Função para fazer logout () => void
 * @returns {boolean} contextValue.loading - Estado de carregamento de operações assíncronas
 * 
 * TRATAMENTO DE ERRO:
 * - Lança erro se usado fora do <AuthProvider>
 * - Previne bugs silenciosos e facilita debug
 * - Mensagem de erro clara e descritiva
 * 
 * SEGURANÇA:
 * - Não armazena token no localStorage (proteção XSS)
 * - Token gerenciado via httpOnly cookies
 * - Validação de contexto em tempo de desenvolvimento
 * 
 * @throws {Error} Se o hook for usado fora do AuthProvider
 * @example
 * // ✅ Uso correto
 * <AuthProvider>
 *   <MeuComponente />  {/* useAuth funciona aqui *\/}
 * </AuthProvider>
 * 
 * // ❌ Uso incorreto (gera erro)
 * <MeuComponente />  {/* useAuth NÃO funciona aqui *\/}
 */

import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

/**
 * Hook principal para acessar autenticação em componentes
 * Wrapper conveniente ao redor do useContext(AuthContext)
 * Adiciona validação de segurança para uso correto
 * 
 * @returns {Object} Contexto de autenticação completo
 */
export function useAuth() {
  // Tenta acessar o contexto de autenticação
  const context = useContext(AuthContext);
  
  // Validação de segurança: garante que o provider está presente
  // Sem essa validação, erros seriam difíceis de debugar
  if (!context) {
    throw new Error(
      '❌ useAuth deve ser usado dentro de um AuthProvider. ' +
      'Certifique-se de envolver seu componente com <AuthProvider>.'
    );
  }
  
  // Retorna o contexto completo para uso no componente
  return context;
}
