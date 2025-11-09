// Configurações de Rate Limiting específicas para diferentes endpoints
// Protege contra ataques de força bruta e abuso de API
import rateLimit from 'express-rate-limit';

/**
 * Rate Limiter para tentativas de login
 * Mais restritivo que o global para proteger contra brute force
 * DESENVOLVIMENTO: 20 tentativas a cada 15 minutos (produção: 5)
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 5 : 20, // Dev: 20 tentativas, Prod: 5
  message: {
    error: 'Muitas tentativas de login. Por segurança, tente novamente em 15 minutos.',
    code: 'TOO_MANY_LOGIN_ATTEMPTS'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Mensagem personalizada quando o limite é atingido
  handler: (req, res) => {
    console.warn(`🚨 Rate limit excedido - IP: ${req.ip} - Endpoint: LOGIN`);
    res.status(429).json({
      error: 'Muitas tentativas de login. Por segurança, tente novamente em 15 minutos.',
      code: 'TOO_MANY_LOGIN_ATTEMPTS',
      retryAfter: '15 minutos'
    });
  }
});

/**
 * Rate Limiter para criação de recursos
 * Protege contra spam de criação de agendamentos, usuários, etc.
 * 20 criações por hora
 */
export const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20, // Máximo 20 criações por hora
  message: {
    error: 'Muitas criações em pouco tempo. Aguarde um pouco antes de tentar novamente.',
    code: 'TOO_MANY_CREATES'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Conta mesmo requisições bem-sucedidas
});

/**
 * Rate Limiter para operações de exclusão
 * Mais restritivo para prevenir exclusões em massa
 * 10 exclusões por hora
 */
export const deleteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // Máximo 10 exclusões por hora
  message: {
    error: 'Muitas exclusões em pouco tempo. Aguarde antes de tentar novamente.',
    code: 'TOO_MANY_DELETES'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate Limiter para exportação de dados
 * Previne sobrecarga de processamento e possível exfiltração de dados
 * 5 exportações a cada 10 minutos
 */
export const exportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 5, // Máximo 5 exportações
  message: {
    error: 'Muitas exportações em pouco tempo. Aguarde alguns minutos.',
    code: 'TOO_MANY_EXPORTS'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
