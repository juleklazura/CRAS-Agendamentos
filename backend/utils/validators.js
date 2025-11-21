/**
 * Valida CPF usando o algoritmo de dígitos verificadores
 * @param {string} cpf - CPF a ser validado
 * @returns {boolean} - true se válido, false se inválido
 */
function validarCPF(cpf) {
  // Remove caracteres não numéricos
  cpf = cpf.replace(/[^\d]/g, '');
  
  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais (CPF inválido)
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  
  // Valida primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  let digito1 = resto === 10 || resto === 11 ? 0 : resto;
  
  if (digito1 !== parseInt(cpf.charAt(9))) return false;
  
  // Valida segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = 11 - (soma % 11);
  let digito2 = resto === 10 || resto === 11 ? 0 : resto;
  
  if (digito2 !== parseInt(cpf.charAt(10))) return false;
  
  return true;
}

/**
 * Valida telefone brasileiro
 * @param {string} telefone - Telefone a ser validado
 * @returns {boolean} - true se válido, false se inválido
 */
function validarTelefone(telefone) {
  // Remove caracteres não numéricos
  telefone = telefone.replace(/[^\d]/g, '');
  
  // Valida formato: (DD) 9XXXX-XXXX ou (DD) XXXX-XXXX
  return telefone.length === 10 || telefone.length === 11;
}

/**
 * Valida email
 * @param {string} email - Email a ser validado
 * @returns {boolean} - true se válido, false se inválido
 */
function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export { validarCPF, validarTelefone, validarEmail };
