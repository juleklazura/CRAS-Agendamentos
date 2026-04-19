// =============================================================================
// 🔒 VALIDADOR DE SEGURANÇA - JWT SECRETS
// =============================================================================
// Garante que JWT_SECRET e JWT_REFRESH_SECRET estão configurados corretamente
// Executado na inicialização do servidor para prevenir configurações inseguras

import dotenv from 'dotenv';
import logger from './logger.js';

dotenv.config();

/**
 * Valida força e configuração dos JWT secrets
 * @throws {Error} Se configuração for insegura
 */
export const validateSecrets = () => {
  const errors = [];
  const warnings = [];
  
  // -------------------------------------------------------------------------
  // Validar ENCRYPTION_KEY
  // -------------------------------------------------------------------------

  if (!process.env.ENCRYPTION_KEY) {
    errors.push('❌ ENCRYPTION_KEY não está definida no .env. Obrigatória para proteção de dados LGPD (CPF, nome, telefone).');
  } else {
    const encKey = process.env.ENCRYPTION_KEY;
    if (encKey.length < 32) {
      errors.push(`❌ ENCRYPTION_KEY muito curta (${encKey.length} caracteres). Mínimo recomendado: 64 caracteres`);
    }
    if (process.env.JWT_SECRET && encKey === process.env.JWT_SECRET) {
      errors.push('❌ ENCRYPTION_KEY deve ser DIFERENTE do JWT_SECRET. Use secrets independentes para cada propósito.');
    }
  }

  // -------------------------------------------------------------------------
  // Validar JWT_SECRET
  // -------------------------------------------------------------------------
  
  if (!process.env.JWT_SECRET) {
    errors.push('❌ JWT_SECRET não está definido no arquivo .env');
  } else {
    const jwtSecret = process.env.JWT_SECRET;
    
    // Verificar comprimento mínimo (64 caracteres recomendado)
    if (jwtSecret.length < 32) {
      errors.push(`❌ JWT_SECRET muito curto (${jwtSecret.length} caracteres). Mínimo recomendado: 64 caracteres`);
    } else if (jwtSecret.length < 64) {
      warnings.push(`⚠️  JWT_SECRET poderia ser mais forte (${jwtSecret.length} caracteres). Recomendado: 64+ caracteres`);
    }
    
    // Verificar se não é o valor padrão do exemplo
    const insecureDefaults = [
      'sua_chave_jwt_super_secreta_aqui',
      'segredo_super_secreto',
      'mysecret',
      'secret',
      'jwt_secret'
    ];
    
    if (insecureDefaults.some(def => jwtSecret.toLowerCase().includes(def))) {
      errors.push('❌ JWT_SECRET está usando valor padrão inseguro. Gere um secret forte!');
    }
    
    // Verificar entropia (deve ter variedade de caracteres)
    const uniqueChars = new Set(jwtSecret).size;
    if (uniqueChars < 16) {
      warnings.push(`⚠️  JWT_SECRET tem baixa entropia (${uniqueChars} caracteres únicos). Recomendado: usar gerador de secrets aleatórios`);
    }
  }
  
  // -------------------------------------------------------------------------
  // Validar JWT_REFRESH_SECRET
  // -------------------------------------------------------------------------
  
  if (!process.env.JWT_REFRESH_SECRET) {
    warnings.push('⚠️  JWT_REFRESH_SECRET não definido. Usando JWT_SECRET (menos seguro). Configure um secret separado!');
  } else {
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    
    // Verificar comprimento
    if (refreshSecret.length < 32) {
      errors.push(`❌ JWT_REFRESH_SECRET muito curto (${refreshSecret.length} caracteres). Mínimo recomendado: 64 caracteres`);
    } else if (refreshSecret.length < 64) {
      warnings.push(`⚠️  JWT_REFRESH_SECRET poderia ser mais forte (${refreshSecret.length} caracteres). Recomendado: 64+ caracteres`);
    }
    
    // Verificar se é diferente do JWT_SECRET
    if (process.env.JWT_SECRET && refreshSecret === process.env.JWT_SECRET) {
      errors.push('❌ JWT_REFRESH_SECRET deve ser DIFERENTE do JWT_SECRET para maior segurança!');
    }
    
    // Verificar valor padrão
    const insecureRefreshDefaults = [
      'outra_chave_jwt_diferente',
      'segredo_refresh',
      'refresh_secret'
    ];
    
    if (insecureRefreshDefaults.some(def => refreshSecret.toLowerCase().includes(def))) {
      errors.push('❌ JWT_REFRESH_SECRET está usando valor padrão inseguro. Gere um secret forte!');
    }
  }
  
  // -------------------------------------------------------------------------
  // Validar NODE_ENV
  // -------------------------------------------------------------------------
  
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 64) {
      errors.push('❌ PRODUÇÃO: JWT_SECRET deve ter no mínimo 64 caracteres em ambiente de produção!');
    }
    
    if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 64) {
      errors.push('❌ PRODUÇÃO: JWT_REFRESH_SECRET deve ter no mínimo 64 caracteres em ambiente de produção!');
    }
  }
  
  // -------------------------------------------------------------------------
  // Exibir resultados
  // -------------------------------------------------------------------------
  
  if (process.env.NODE_ENV !== 'test') {
    logger.info('🔒 ========================================');
    logger.info('   VALIDAÇÃO DE SEGURANÇA - JWT SECRETS');
    logger.info('========================================');
  }
  
  if (errors.length > 0) {
    if (process.env.NODE_ENV !== 'test') {
      logger.error('❌ ERROS CRÍTICOS ENCONTRADOS:');
      errors.forEach(error => logger.error(`   ${error}`));
    }
  }
  
  if (warnings.length > 0) {
    if (process.env.NODE_ENV !== 'test') {
      logger.warn('⚠️  AVISOS DE SEGURANÇA:');
      warnings.forEach(warning => logger.warn(`   ${warning}`));
    }
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    if (process.env.NODE_ENV !== 'test') {
      logger.info('✅ Todos os secrets estão configurados corretamente!');
    }
  }
  
  // -------------------------------------------------------------------------
  // Instruções de como gerar secrets seguros
  // -------------------------------------------------------------------------
  
  if (errors.length > 0 || warnings.length > 0) {
    if (process.env.NODE_ENV !== 'test') {
      logger.info('💡 COMO GERAR SECRETS SEGUROS:');
      logger.info('   Node.js:');
      logger.info('   $ node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
      logger.info('');
      logger.info('   OpenSSL:');
      logger.info('   $ openssl rand -hex 64');
      logger.info('');
      logger.info('   Online (use apenas em desenvolvimento):');
      logger.info('   https://www.random.org/strings/');
    }
  }
  
  if (process.env.NODE_ENV !== 'test') {
    logger.info('========================================');
  }
  
  // -------------------------------------------------------------------------
  // Lançar erro se houver problemas críticos
  // -------------------------------------------------------------------------
  
  if (errors.length > 0) {
    throw new Error(
      `Configuração de segurança inválida! Encontrados ${errors.length} erro(s) crítico(s). ` +
      'Corrija os problemas acima antes de iniciar o servidor.'
    );
  }
  
  if (warnings.length > 0 && process.env.NODE_ENV === 'production') {
    throw new Error(
      'Avisos de segurança encontrados em ambiente de PRODUÇÃO! ' +
      'Resolva todos os avisos antes de fazer deploy.'
    );
  }
};

/**
 * Gera secrets seguros para uso em desenvolvimento
 * @returns {Object} Objeto com JWT_SECRET e JWT_REFRESH_SECRET
 */
export const generateSecrets = async () => {
  const crypto = await import('crypto');
  
  return {
    JWT_SECRET: crypto.randomBytes(64).toString('hex'),
    JWT_REFRESH_SECRET: crypto.randomBytes(64).toString('hex')
  };
};

// Validar automaticamente ao importar este módulo
validateSecrets();
