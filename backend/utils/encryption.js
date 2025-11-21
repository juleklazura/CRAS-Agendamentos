import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// Gerar chave de criptografia a partir do JWT_SECRET ou variável dedicada
const getEncryptionKey = () => {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('ENCRYPTION_KEY ou JWT_SECRET não definidos no .env');
  }
  // Criar hash SHA-256 de 32 bytes da secret
  return crypto.createHash('sha256').update(String(secret)).digest();
};

class EncryptionService {
  /**
   * Criptografa um texto usando AES-256-CBC
   * @param {string} text - Texto a ser criptografado
   * @returns {string} - Texto criptografado no formato iv:encrypted
   */
  static encrypt(text) {
    if (!text) return text;
    
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const key = getEncryptionKey();
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      
      let encrypted = cipher.update(String(text), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Erro ao criptografar:', error.message);
      throw new Error('Falha na criptografia');
    }
  }

  /**
   * Descriptografa um texto criptografado
   * @param {string} text - Texto criptografado no formato iv:encrypted
   * @returns {string} - Texto descriptografado
   */
  static decrypt(text) {
    if (!text || !text.includes(':')) return text;
    
    try {
      const [ivHex, encryptedHex] = text.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const key = getEncryptionKey();
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Erro ao descriptografar:', error.message);
      return text; // Retorna o texto original se falhar
    }
  }

  /**
   * Cria um hash SHA-256 de um texto (para indexação)
   * @param {string} text - Texto a ser hasheado
   * @returns {string} - Hash hexadecimal
   */
  static hash(text) {
    if (!text) return text;
    return crypto.createHash('sha256').update(String(text)).digest('hex');
  }

  /**
   * Verifica se um texto está criptografado
   * @param {string} text - Texto a verificar
   * @returns {boolean}
   */
  static isEncrypted(text) {
    if (!text || typeof text !== 'string') return false;
    // Formato esperado: 32 caracteres hex (IV) + ':' + dados hex
    return /^[0-9a-f]{32}:[0-9a-f]+$/i.test(text);
  }
}

export default EncryptionService;
