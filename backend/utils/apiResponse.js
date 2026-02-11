// =============================================================================
// 📦 UTILITÁRIO DE RESPOSTAS PADRONIZADAS DA API
// =============================================================================
// Todas as respostas seguem o formato:
//   Sucesso: { success: true,  data: <payload>, message: <string|null> }
//   Erro:    { success: false, message: <string>, errors?: [...], code?: <string> }
//
// O frontend possui interceptor Axios que faz unwrap automático:
//   response.data = response.data.data  (para respostas de sucesso)
//   error.response.data.message         (para erros — já funciona nativamente)
// =============================================================================

/**
 * Resposta de sucesso com dados (objetos, arrays, dados paginados).
 * @param {Response} res - Express response
 * @param {*} data - Payload (objeto, array, dados paginados, etc.)
 * @param {number} [statusCode=200] - HTTP status (200, 201, etc.)
 */
export const apiSuccess = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, data });
};

/**
 * Resposta de sucesso com mensagem (delete, ações de confirmação).
 * Mantém compatibilidade: após unwrap, response.data = { message: '...' }
 * @param {Response} res - Express response
 * @param {string} message - Mensagem descritiva
 * @param {number} [statusCode=200] - HTTP status
 */
export const apiMessage = (res, message, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, data: { message } });
};

/**
 * Resposta de erro padronizada.
 * @param {Response} res - Express response
 * @param {string} message - Mensagem de erro
 * @param {number} [statusCode=400] - HTTP status (400, 401, 403, 404, 409, 500)
 * @param {Object} [extras={}] - Campos extras (code, field, dependencias, etc.)
 */
export const apiError = (res, message, statusCode = 400, extras = {}) => {
  return res.status(statusCode).json({ success: false, message, ...extras });
};
