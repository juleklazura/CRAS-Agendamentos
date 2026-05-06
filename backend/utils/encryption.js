// Criptografia de dados pessoais em repouso (LGPD).
// Algoritmo: AES-256-GCM com IV único por valor, retrocompatível com AES-256-CBC legado.
// Hash: HMAC-SHA-256 sobre CPF permite busca eficiente sem descriptografar.

import crypto from 'crypto';

// Algoritmo atual: AES-256-GCM (criptografia autenticada)
// GCM = Galois/Counter Mode — inclui autenticação do ciphertext
// Previne ataques de padding oracle e adulteração de dados
const ALGORITHM_GCM = 'aes-256-gcm';
const ALGORITHM_CBC = 'aes-256-cbc'; // legado — apenas para decriptação

// IV (Initialization Vector) em bytes
const GCM_IV_LENGTH = 12;  // 96 bits — recomendado pela NIST para GCM
const CBC_IV_LENGTH = 16;  // 128 bits — usado no formato antigo

// Auth tag em bytes (GCM)
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Gera chave AES-256 (32 bytes) a partir de `ENCRYPTION_KEY` via SHA-256.
 * SHA-256 garante comprimento exato de 32 bytes independentemente do tamanho da env var.
 * Deve ser um segredo separado de JWT_SECRET.
 */
const getEncryptionKey = () => {
  const secret = process.env.ENCRYPTION_KEY;
  
  if (!secret) {
    throw new Error('ENCRYPTION_KEY não definida no .env. Configure uma chave separada do JWT_SECRET.');
  }
  
  return crypto.createHash('sha256').update(String(secret)).digest();
};

/**
 * Serviço de criptografia de dados pessoais (LGPD).
 *
 * Protege CPF, telefone e nome em repouso usando AES-256-GCM (AEAD).
 * GCM inclui autenticação do ciphertext, prevenindo adulteração e padding oracle.
 * Retrocompatível com valores antigos em AES-256-CBC.
 * A chave é derivada de `ENCRYPTION_KEY` via SHA-256.
 */
class EncryptionService {
  /**
   * Criptografa texto com AES-256-GCM.
   * Formato de saída: `IV_hex:authTag_hex:ciphertext_hex`
   * (IV = 12 bytes / 24 hex; authTag = 16 bytes / 32 hex)
   */
  static encrypt(text) {
    if (!text) return text;
    
    try {
      const iv = crypto.randomBytes(GCM_IV_LENGTH);
      const key = getEncryptionKey();
      const cipher = crypto.createCipheriv(ALGORITHM_GCM, key, iv);
      
      let encrypted = cipher.update(String(text), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Erro ao criptografar:', error.message);
      throw new Error('Falha na criptografia');
    }
  }

  /**
   * Descriptografa texto produzido por `encrypt()`.
   * Detecta automaticamente o formato GCM (3 partes) ou CBC legado (2 partes).
   * Lança erro se a auth tag GCM não corresponder (adulteração detectada).
   */
  static decrypt(text) {
    if (!text || !text.includes(':')) return text;
    
    try {
      const parts = text.split(':');
      const key = getEncryptionKey();
      
      if (parts.length === 3) {
        // Formato GCM: iv:authTag:encrypted
        const [ivHex, authTagHex, encryptedHex] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM_GCM, key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      }
      
      if (parts.length === 2) {
        // Formato CBC legado: iv:encrypted
        const [ivHex, encryptedHex] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM_CBC, key, iv);
        
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      }
      
      // Formato desconhecido — dado não foi criptografado por este sistema
      return null;
    } catch (error) {
      // Não incluir o ciphertext na mensagem de erro — evita vazâ-lo em logs.
      // Causas comuns: ENCRYPTION_KEY alterada, dado corrompido,
      // auth tag inválida (GCM detectou adulteração).
      throw new Error(`Falha na descriptografia: ${error.message}`);
    }
  }

  /**
   * Cria HMAC-SHA-256 do texto usando `ENCRYPTION_KEY` como segredo.
   *
   * Usado para `cpfHash`: permite buscar agendamentos por CPF sem descriptografar.
   * HMAC (em vez de SHA-256 puro) torna invíavel ataques de rainbow table —
   * o atacante precisaria da ENCRYPTION_KEY além do hash para pré-computar os valores.
   *
   * Atencao: alterar ENCRYPTION_KEY invalida todos os hashes existentes.
   *
   * @param {string} text - Texto a hashar (ex: CPF sem formatação)
   * @returns {string} HMAC-SHA-256 em hex (64 caracteres)
   */
  static hash(text) {
    if (!text) return text;
    const key = process.env.ENCRYPTION_KEY;
    if (!key) throw new Error('ENCRYPTION_KEY não definida');
    return crypto.createHmac('sha256', key).update(String(text)).digest('hex');
  }

  /**
   * Retorna `true` se o texto está no formato GCM (`24hex:32hex:hex+`)
   * ou no formato CBC legado (`32hex:hex+`).
   * Usado para evitar tentar descriptografar texto plano.
   */
  static isEncrypted(text) {
    if (!text || typeof text !== 'string') return false;
    // Formato GCM: 24 hex (IV 12 bytes) + ':' + 32 hex (authTag 16 bytes) + ':' + dados hex
    // Formato CBC legado: 32 hex (IV 16 bytes) + ':' + dados hex
    return /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/i.test(text)
        || /^[0-9a-f]{32}:[0-9a-f]+$/i.test(text);
  }

  /**
   * Funções de ofsucação (LGPD — princípio da minimização, Art. 6º)
   * Permitem exibir dados parciais sem expor o valor completo.
   */

  /**
   * Ofusca CPF para exibição parcial: `123.***.***-00`.
   * Mantém os 3 primeiros e 2 últimos dígitos; oculta o restante.
   */
  static maskCPF(cpf) {
    if (!cpf || typeof cpf !== 'string') return '';
    
    // Remover formatação
    const cleaned = cpf.replace(/\D/g, '');
    
    // Validar comprimento
    if (cleaned.length !== 11) {
      // Se não for CPF válido, retornar original (pode ser erro)
      return cpf;
    }
    
    // Formatar ofuscado: 123.***.***-00
    return `${cleaned.substring(0, 3)}.***.***-${cleaned.substring(9)}`;
  }

  /**
   * Ofusca telefone para exibição parcial
   * 
   * PROPÓSITO:
   * - Permitir identificação de tipo (celular/fixo)
   * - Compliance com LGPD (minimização de dados)
   * - Prevenir ligações não autorizadas
   * 
   * FORMATO:
   * - Mantém DDD (região)
   * - Mantém 4 últimos dígitos (verificação)
   * - Oculta dígitos intermediários
   * 
   * @param {string} telefone - Telefone descriptografado
   * @returns {string} Telefone ofuscado
   * 
   * EXEMPLOS:
   * ```javascript
   * EncryptionService.maskTelefone('11987654321')      // → '(11) *****-4321' (celular)
   * EncryptionService.maskTelefone('1132123456')       // → '(11) ****-3456' (fixo)
   * EncryptionService.maskTelefone('(11) 98765-4321')  // → '(11) *****-4321'
   * EncryptionService.maskTelefone(null)               // → ''
   * ```
   * 
   * CASOS DE USO:
   * - Listagens para recepção
   * - Confirmações de contato
   * - Histórico de atendimentos
   */
  static maskTelefone(telefone) {
    if (!telefone || typeof telefone !== 'string') return '';
    
    // Remover formatação
    const cleaned = telefone.replace(/\D/g, '');
    
    // Celular (11 dígitos: DDD + 9 + 8 dígitos)
    if (cleaned.length === 11) {
      return `(${cleaned.substring(0, 2)}) *****-${cleaned.substring(7)}`;
    }
    
    // Fixo (10 dígitos: DDD + 8 dígitos)
    if (cleaned.length === 10) {
      return `(${cleaned.substring(0, 2)}) ****-${cleaned.substring(6)}`;
    }
    
    // Formato inválido - retornar original
    return telefone;
  }
}

export default EncryptionService;
