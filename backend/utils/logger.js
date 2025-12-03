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
  }
};

export default logger;
