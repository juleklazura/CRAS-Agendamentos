// Sistema de logging estruturado para produção
// Suporta diferentes níveis de log e formatação apropriada
const isProduction = process.env.NODE_ENV === 'production';

// Cores ANSI para logs no console (apenas desenvolvimento)
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Formata timestamp
const timestamp = () => new Date().toISOString();

// Logger básico estruturado
const logger = {
  // Log de informações gerais
  info: (message, meta = {}) => {
    if (isProduction) {
      console.log(JSON.stringify({
        level: 'INFO',
        timestamp: timestamp(),
        message,
        ...meta
      }));
    } else {
      console.log(`${colors.blue}[INFO]${colors.reset} ${timestamp()} - ${message}`, meta);
    }
  },

  // Log de avisos (não são erros, mas precisam atenção)
  warn: (message, meta = {}) => {
    if (isProduction) {
      console.warn(JSON.stringify({
        level: 'WARN',
        timestamp: timestamp(),
        message,
        ...meta
      }));
    } else {
      console.warn(`${colors.yellow}[WARN]${colors.reset} ${timestamp()} - ${message}`, meta);
    }
  },

  // Log de erros
  error: (message, error = null, meta = {}) => {
    const errorData = {
      level: 'ERROR',
      timestamp: timestamp(),
      message,
      ...meta
    };

    if (error) {
      errorData.error = {
        message: error.message,
        stack: isProduction ? undefined : error.stack,
        name: error.name
      };
    }

    if (isProduction) {
      console.error(JSON.stringify(errorData));
    } else {
      console.error(`${colors.red}[ERROR]${colors.reset} ${timestamp()} - ${message}`, error || '', meta);
    }
  },

  // Log de debug (apenas desenvolvimento)
  debug: (message, meta = {}) => {
    if (!isProduction) {
      console.debug(`${colors.magenta}[DEBUG]${colors.reset} ${timestamp()} - ${message}`, meta);
    }
  },

  // Log de segurança (sempre registrado)
  security: (message, meta = {}) => {
    const securityData = {
      level: 'SECURITY',
      timestamp: timestamp(),
      message,
      ...meta
    };

    if (isProduction) {
      console.warn(JSON.stringify(securityData));
    } else {
      console.warn(`${colors.cyan}[SECURITY]${colors.reset} ${timestamp()} - ⚠️ ${message}`, meta);
    }
  },

  // Log de sucesso (apenas desenvolvimento)
  success: (message, meta = {}) => {
    if (!isProduction) {
      console.log(`${colors.green}[SUCCESS]${colors.reset} ${timestamp()} - ${message}`, meta);
    } else {
      logger.info(message, meta);
    }
  },

  // Sanitiza dados sensíveis antes de logar (remove senhas, tokens, etc)
  sanitize: (data) => {
    if (!data || typeof data !== 'object') return data;
    
    const sensitiveFields = ['password', 'senha', 'token', 'cpf', 'telefone1', 'telefone2', 'authorization'];
    const sanitized = { ...data };
    
    // Se for um objeto com request dentro
    if (sanitized.request && typeof sanitized.request === 'object') {
      sanitized.request = { ...sanitized.request };
      for (const field of sensitiveFields) {
        if (sanitized.request[field]) {
          sanitized.request[field] = '[REDACTED]';
        }
      }
    }
    
    // Sanitiza campos no nível raiz também
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
};

/**
 * Pseudonimiza um endereço IP para conformidade com a LGPD (Art. 5º, I).
 * IP é dado pessoal — não deve ser armazenado em texto puro nos logs.
 *
 * - IPv4: mascara o último octeto       → "192.168.1.x"
 * - IPv6 mapeado para IPv4:             → "::ffff:192.168.1.x"
 * - IPv6 puro: mantém 4 primeiros grupos → "2001:db8:85a3:0::x"
 * - Desconhecido/null:                  → "[IP desconhecido]"
 *
 * @param {string|undefined} ip - Endereço IP bruto do request
 * @returns {string} IP pseudonimizado
 */
export const pseudonymizeIp = (ip) => {
  if (!ip) return '[IP desconhecido]';

  // IPv4 puro (ex: "192.168.1.100")
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    return ip.replace(/\.\d+$/, '.x');
  }

  // IPv6 mapeado para IPv4 (ex: "::ffff:192.168.1.100")
  const ipv4Mapped = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d+$/i);
  if (ipv4Mapped) {
    return `::ffff:${ipv4Mapped[1]}.x`;
  }

  // IPv6 puro: mantém apenas os 4 primeiros grupos
  const parts = ip.split(':');
  if (parts.length >= 2) {
    return parts.slice(0, 4).join(':') + '::x';
  }

  return '[IP desconhecido]';
};

export default logger;
