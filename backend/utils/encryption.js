// ═══════════════════════════════════════════════════════════════════════════
// 🔐 SERVIÇO DE CRIPTOGRAFIA DE DADOS SENSÍVEIS
// ═══════════════════════════════════════════════════════════════════════════
// Sistema para criptografar dados pessoais (CPF, telefone, nome) no banco
// Usa AES-256-GCM com IV único + auth tag para cada valor
// Retrocompatível com dados antigos em AES-256-CBC
// ═══════════════════════════════════════════════════════════════════════════

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
 * Gera chave de criptografia de 32 bytes (256 bits) a partir de ENCRYPTION_KEY
 * 
 * SEGURANÇA:
 * - ENCRYPTION_KEY deve ser um secret separado e independente do JWT_SECRET
 * - Mesmo secret sempre gera mesma chave (determinístico)
 * - SHA-256 garante que chave tem exatamente 256 bits
 * 
 * @returns {Buffer} - Chave de 32 bytes para AES-256
 * @throws {Error} - Se ENCRYPTION_KEY não estiver configurada
 */
const getEncryptionKey = () => {
  const secret = process.env.ENCRYPTION_KEY;
  
  if (!secret) {
    throw new Error('ENCRYPTION_KEY não definida no .env. Configure uma chave separada do JWT_SECRET.');
  }
  
  // Criar hash SHA-256 de 32 bytes do secret
  // SHA-256 sempre produz 256 bits (32 bytes), perfeito para AES-256
  return crypto.createHash('sha256').update(String(secret)).digest();
};

/**
 * Serviço de criptografia para proteção de dados pessoais (LGPD)
 * 
 * PROPÓSITO:
 * - Criptografar dados sensíveis antes de salvar no banco
 * - Descriptografar dados ao recuperar do banco
 * - Criar hashes para buscas sem expor dados
 * 
 * DADOS PROTEGIDOS:
 * - CPF (identificação)
 * - Telefones (contato)
 * - Nomes completos (identificação)
 * 
 * MÉTODO:
 * - AES-256-CBC com IV aleatório por valor
 * - Formato: "iv_hex:dados_criptografados_hex"
 * - IV diferente = mesmos dados têm aparência diferente no banco
 * 
 * CONFORMIDADE LGPD:
 * - Dados pessoais sempre criptografados em repouso
 * - Chave de criptografia isolada em variáveis de ambiente
 * - Hashes permitem buscar sem descriptografar
 */
class EncryptionService {
  /**
   * Criptografa um texto usando AES-256-CBC
   * 
   * FUNCIONAMENTO:
   * 1. Gera IV aleatório único (16 bytes)
   * 2. Cria cipher AES-256-CBC com chave e IV
   * 3. Criptografa texto em hexadecimal
   * 4. Retorna formato "iv:encrypted" para armazenar IV junto
   * 
   * FORMATO DE SAÍDA (GCM):
   * "24_chars_hex_IV:32_chars_hex_authTag:dados_criptografados_hex"
   * Exemplo: "a1b2c3d4e5f6a1b2c3d4e5f6:9e8d7c6b5a4f3e2d1c0b9a8f:..."
   * 
   * DIFERENÇA DO CBC:
   * - CBC: "32_chars_IV:encrypted" (sem autenticação)
   * - GCM: "24_chars_IV:32_chars_authTag:encrypted" (com autenticação)
   * 
   * POR QUE GCM?
   * - Inclui autenticação do ciphertext (AEAD)
   * - Previne ataques de padding oracle
   * - Detecta adulteração dos dados
   * - Performance melhor que CBC+HMAC
   * 
   * @param {string} text - Texto plano a ser criptografado
   * @returns {string} - Texto criptografado no formato "iv:authTag:encrypted"
   * @throws {Error} - Se criptografia falhar
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
   * Descriptografa um texto criptografado
   * 
   * RETROCOMPATÍVEL:
   * - Detecta formato GCM (3 partes: iv:authTag:encrypted) ou CBC (2 partes: iv:encrypted)
   * - Dados antigos em CBC são descriptografados normalmente
   * - Novos dados sempre usam GCM
   * 
   * @param {string} text - Texto criptografado "iv:authTag:encrypted" (GCM) ou "iv:encrypted" (CBC)
   * @returns {string} - Texto descriptografado original
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
      
      return text; // Formato desconhecido — retorna original
    } catch (error) {
      console.error('Erro ao descriptografar:', error.message);
      return text; // Retorna o texto original se falhar
    }
  }

  /**
   * Cria um hash SHA-256 de um texto (para indexação e buscas)
   * 
   * PROPÓSITO:
   * - Permitir buscar dados sem descriptografar tudo
   * - Hash é determinístico: mesmo input = mesmo hash sempre
   * - Hash é irreversível: não pode voltar ao texto original
   * 
   * USO NO SISTEMA:
   * - cpfHash = hash do CPF para buscar agendamentos
   * - Busca compara hash vs hash (rápido)
   * - Não expõe CPF real durante busca
   * 
   * DIFERENÇA DE CRIPTOGRAFIA:
   * - Criptografia: reversível (pode descriptografar)
   * - Hash: irreversível (não pode recuperar original)
   * 
   * @param {string} text - Texto plano a ser hasheado
   * @returns {string} - Hash SHA-256 em hexadecimal (64 caracteres)
   * 
   * EXEMPLO:
   * ```javascript
   * EncryptionService.hash("123.456.789-00")
   * // Retorna: "5e884898da28047151d0e56f8dc629..." (sempre o mesmo)
   * 
   * // Buscar por CPF:
   * const cpfHash = EncryptionService.hash(cpfBuscado);
   * Appointment.find({ cpfHash }); // Rápido e seguro
   * ```
   */
  static hash(text) {
    if (!text) return text;
    return crypto.createHash('sha256').update(String(text)).digest('hex');
  }

  /**
   * Verifica se um texto está criptografado (formato válido)
   * 
   * FUNCIONAMENTO:
   * - Valida formato "iv:encrypted"
   * - IV deve ter exatamente 32 caracteres hex (16 bytes)
   * - Dados criptografados devem ser hex
   * 
   * REGEX EXPLICADO:
   * - ^[0-9a-f]{32} = Começa com 32 caracteres hexadecimais (IV)
   * - : = Separador literal
   * - [0-9a-f]+ = Um ou mais caracteres hex (dados)
   * - $ = Fim da string
   * - /i = Case insensitive
   * 
   * USO:
   * - Evitar tentar descriptografar texto plano
   * - Validar dados antes de processar
   * - Detectar se migração de criptografia é necessária
   * 
   * @param {string} text - Texto a verificar
   * @returns {boolean} - true se está no formato criptografado válido
   * 
   * EXEMPLOS:
   * ```javascript
   * EncryptionService.isEncrypted("a1b2c3...f0:9e8d7c...3a") // true
   * EncryptionService.isEncrypted("123.456.789-00")          // false
   * EncryptionService.isEncrypted(null)                      // false
   * EncryptionService.isEncrypted("apenas_hex_sem_dois_pontos") // false
   * ```
   */
  static isEncrypted(text) {
    if (!text || typeof text !== 'string') return false;
    // Formato GCM: 24 hex (IV 12 bytes) + ':' + 32 hex (authTag 16 bytes) + ':' + dados hex
    // Formato CBC legado: 32 hex (IV 16 bytes) + ':' + dados hex
    return /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/i.test(text)
        || /^[0-9a-f]{32}:[0-9a-f]+$/i.test(text);
  }

  /**
   * ========================================
   * FUNÇÕES DE OFUSCAÇÃO (LGPD)
   * ========================================
   * Permitem visualização parcial sem expor dados sensíveis completos
   * Implementam o princípio da minimização (LGPD Art. 6º)
   */

  /**
   * Ofusca CPF para exibição parcial
   * 
   * PROPÓSITO:
   * - Permitir identificação visual sem expor CPF completo
   * - Compliance com LGPD (minimização de dados)
   * - Prevenir memorização/cópia não autorizada
   * 
   * FORMATO:
   * - Mantém 3 primeiros dígitos (identificação regional)
   * - Mantém 2 últimos dígitos (verificação rápida)
   * - Oculta 6 dígitos intermediários (dados sensíveis)
   * 
   * @param {string} cpf - CPF descriptografado (com ou sem formatação)
   * @returns {string} CPF ofuscado no formato 123.***.***-00
   * 
   * EXEMPLOS:
   * ```javascript
   * EncryptionService.maskCPF('12345678900')       // → '123.***.***-00'
   * EncryptionService.maskCPF('123.456.789-00')    // → '123.***.***-00'
   * EncryptionService.maskCPF('invalid')           // → 'invalid' (fallback)
   * EncryptionService.maskCPF(null)                // → ''
   * ```
   * 
   * CASOS DE USO:
   * - Listagens para recepção
   * - Relatórios não-confidenciais
   * - Telas de confirmação
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
