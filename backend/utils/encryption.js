// ═══════════════════════════════════════════════════════════════════════════
// 🔐 SERVIÇO DE CRIPTOGRAFIA DE DADOS SENSÍVEIS
// ═══════════════════════════════════════════════════════════════════════════
// Sistema para criptografar dados pessoais (CPF, telefone, nome) no banco
// Usa AES-256-CBC com IV (Initialization Vector) único para cada valor
// ═══════════════════════════════════════════════════════════════════════════

import crypto from 'crypto';

// Algoritmo de criptografia: AES-256 em modo CBC
// AES-256 = Advanced Encryption Standard com chave de 256 bits (muito seguro)
// CBC = Cipher Block Chaining (cada bloco depende do anterior)
const ALGORITHM = 'aes-256-cbc';

// Tamanho do IV (Initialization Vector) em bytes
// IV garante que mesmos dados resultem em criptografias diferentes
const IV_LENGTH = 16; // 128 bits

/**
 * Gera chave de criptografia de 32 bytes (256 bits) a partir de secret
 * 
 * FUNCIONAMENTO:
 * 1. Busca ENCRYPTION_KEY ou JWT_SECRET do .env
 * 2. Cria hash SHA-256 do secret (sempre 32 bytes)
 * 3. Retorna Buffer de 32 bytes para uso no AES-256
 * 
 * SEGURANÇA:
 * - Mesmo secret sempre gera mesma chave (determinístico)
 * - SHA-256 garante que chave tem exatamente 256 bits
 * - Chave é derivada, não o secret bruto
 * 
 * @returns {Buffer} - Chave de 32 bytes para AES-256
 * @throws {Error} - Se secrets não estiverem configurados
 */
const getEncryptionKey = () => {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('ENCRYPTION_KEY ou JWT_SECRET não definidos no .env');
  }
  
  // Criar hash SHA-256 de 32 bytes do secret
  // SHA-256 sempre produz 256 bits (32 bytes), perfeito para AES-256
  return crypto.createHash('sha256').update(String(secret)).digest();
};

/**
 * Serviço de criptografia para proteção de dados pessoais (LGPD)
 * 
 * PROPÓSITO:
 * - Criptografar dados sensíveis antes de salvar no MongoDB
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
   * FORMATO DE SAÍDA:
   * "32_caracteres_hex:dados_criptografados_hex"
   * Exemplo: "a1b2c3d4...f0:9e8d7c6b..."
   * 
   * POR QUE IV JUNTO DOS DADOS?
   * - IV não é secreto, pode ser público
   * - Precisa do mesmo IV para descriptografar
   * - Armazenar junto simplifica recuperação
   * 
   * @param {string} text - Texto plano a ser criptografado
   * @returns {string} - Texto criptografado no formato "iv:encrypted"
   * @throws {Error} - Se criptografia falhar
   * 
   * EXEMPLO:
   * ```javascript
   * EncryptionService.encrypt("123.456.789-00")
   * // Retorna: "a1b2c3...f0:9e8d7c...3a"
   * ```
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
   * 
   * FUNCIONAMENTO:
   * 1. Separa IV e dados criptografados pelo ":"
   * 2. Converte IV de hex para Buffer
   * 3. Cria decipher AES-256-CBC com mesma chave e IV
   * 4. Descriptografa e retorna texto original
   * 
   * VALIDAÇÃO:
   * - Se texto não tem ":", retorna texto original (não criptografado)
   * - Se falhar, retorna texto original (fallback seguro)
   * 
   * IMPORTANTE:
   * - DEVE usar mesmo IV usado na criptografia
   * - DEVE usar mesma chave (do ENCRYPTION_KEY)
   * - Ordem dos bytes importa!
   * 
   * @param {string} text - Texto criptografado "iv:encrypted"
   * @returns {string} - Texto descriptografado original
   * 
   * EXEMPLO:
   * ```javascript
   * EncryptionService.decrypt("a1b2...f0:9e8d...3a")
   * // Retorna: "123.456.789-00"
   * ```
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
    // Formato esperado: 32 caracteres hex (IV) + ':' + dados hex
    return /^[0-9a-f]{32}:[0-9a-f]+$/i.test(text);
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
