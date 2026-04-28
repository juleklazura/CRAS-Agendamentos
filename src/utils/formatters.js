// Utilitários de formatação de dados
// Funções puras reutilizáveis em toda a aplicação

import DOMPurify from 'dompurify';

/**
 * 🔒 SEGURANÇA: Sanitiza texto para prevenir XSS
 * Remove todas as tags HTML e scripts maliciosos
 * Usa escape HTML nativo do navegador para máxima segurança
 * @param {string} text - Texto a ser sanitizado
 * @returns {string} Texto limpo e seguro
 */
export const sanitizeText = (text) => {
  if (!text) return '-';
  // Primeiro usa DOMPurify para remover scripts
  const purified = DOMPurify.sanitize(text, { 
    ALLOWED_TAGS: [],      // Remove todas as tags HTML
    KEEP_CONTENT: true     // Mantém o conteúdo de texto
  });
  // Depois faz escape HTML adicional para garantir segurança
  const div = document.createElement('div');
  div.textContent = String(purified).trim();
  // Retorna textContent (não innerHTML) para evitar que React exiba entidades
  // HTML como &amp;, &lt; etc. literalmente na tela
  return div.textContent;
};

/**
 * Formata CPF para exibição
 * Aceita CPF com ou sem formatação e padroniza para xxx.xxx.xxx-xx
 * @param {string} cpf - CPF em qualquer formato
 * @returns {string} CPF formatado ou '-' se inválido
 */
export const formatarCPFExibicao = (cpf) => {
  if (!cpf) return '-';
  if (cpf.includes('.')) return cpf; // Já formatado
  const apenasNumeros = cpf.replace(/\D/g, '').slice(0, 11);
  return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

/**
 * 🔒 SEGURANÇA: Mascara CPF para exportação (LGPD)
 * Mostra apenas últimos 2 dígitos: ***.***.**-45
 * @param {string} cpf - CPF a ser mascarado
 * @returns {string} CPF mascarado
 */
export const maskCPF = (cpf) => {
  if (!cpf) return '-';
  const apenasNumeros = cpf.replace(/\D/g, '');
  if (apenasNumeros.length !== 11) return '-';
  return `***.***.**-${apenasNumeros.slice(-2)}`;
};

/**
 * 🔒 SEGURANÇA: Mascara telefone para exportação (LGPD)
 * Mostra apenas últimos 4 dígitos: ****-1234
 * @param {string} phone - Telefone a ser mascarado
 * @returns {string} Telefone mascarado
 */
export const maskPhone = (phone) => {
  if (!phone) return '-';
  const apenasNumeros = phone.replace(/\D/g, '');
  if (apenasNumeros.length < 4) return '-';
  return `****-${apenasNumeros.slice(-4)}`;
};

/**
 * Formata data e hora para exibição local
 * @param {string|Date} date - Data a ser formatada
 * @returns {string} Data formatada ou '-'
 */
export const formatDateTime = (date) => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleString('pt-BR');
  } catch {
    return '-';
  }
};

/**
 * Valida se o ID é um ID válido (CUID do Prisma)
 * @param {string} id - ID a ser validado
 * @returns {boolean} true se válido
 */
export const isValidId = (id) => {
  return id && typeof id === 'string' && id.length >= 1 && id.length <= 50 && /^[a-z0-9]+$/i.test(id);
};

// Alias para compatibilidade
export const isValidObjectId = isValidId;

/**
 * Trunca texto para exibição limitada
 * @param {string} text - Texto a ser truncado
 * @param {number} maxLength - Comprimento máximo
 * @returns {string} Texto truncado com reticências
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '-';
  return text.length > maxLength 
    ? text.substring(0, maxLength) + '...' 
    : text;
};

/**
 * Formata uma data JavaScript para string YYYY-MM-DD usando timezone local.
 * Evita o deslocamento que ocorre ao usar toISOString() (que converte para UTC).
 * @param {Date} date - Objeto Date a ser formatado
 * @returns {string} Data no formato YYYY-MM-DD
 */
export const formatarDataLocal = (date) => {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};
