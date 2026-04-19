// =============================================================================
// ERROS DE DOMÍNIO
// =============================================================================
// Centraliza classes de erro de negócio, evitando dependência de utils→services.

/**
 * Erro de regra de negócio.
 * Carrega statusCode HTTP para o controller retornar o código correto.
 */
export class BusinessError extends Error {
  constructor(message, statusCode = 400, code = null) {
    super(message);
    this.name = 'BusinessError';
    this.statusCode = statusCode;
    this.code = code;
  }
}
