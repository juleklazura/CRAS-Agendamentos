// =============================================================================
// 📋 CONSTANTES DE POPULATE — CAMPOS POPULADOS PADRONIZADOS
// =============================================================================
// Centraliza os campos de populate usados nas queries do Mongoose.
// Evita inconsistências entre controllers/services e facilita manutenção.

/**
 * Populate padrão para agendamentos — listagens e respostas de CRUD.
 */
export const APPOINTMENT_POPULATE = [
  { path: 'entrevistador', select: 'name email matricula' },
  { path: 'cras', select: 'nome endereco telefone' },
  { path: 'createdBy', select: 'name matricula' },
];

/**
 * Populate completo — inclui updatedBy (para update/confirmação).
 */
export const APPOINTMENT_POPULATE_FULL = [
  ...APPOINTMENT_POPULATE,
  { path: 'updatedBy', select: 'name matricula' },
];

/**
 * Populate leve para listagens — menos campos = mais rápido.
 */
export const APPOINTMENT_POPULATE_LIST = [
  { path: 'entrevistador', select: 'name matricula' },
  { path: 'cras', select: 'nome' },
];
