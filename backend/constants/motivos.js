// =============================================================================
// 🔄 MAPEAMENTO DE MOTIVOS — ENUM PRISMA ↔ LABEL FRONTEND
// =============================================================================
// No banco anterior os motivos eram strings com acentos.
// No PostgreSQL usamos enum sem acentos. Este módulo faz a conversão.

/**
 * Mapa: label frontend → valor enum do Prisma
 */
export const MOTIVO_TO_ENUM = {
  'Atualização Cadastral': 'atualizacao_cadastral',
  'Inclusão': 'inclusao',
  'Transferência de Município': 'transferencia_municipio',
  'Orientações Gerais': 'orientacoes_gerais',
};

/**
 * Mapa: valor enum do Prisma → label frontend
 */
export const ENUM_TO_MOTIVO = {
  'atualizacao_cadastral': 'Atualização Cadastral',
  'inclusao': 'Inclusão',
  'transferencia_municipio': 'Transferência de Município',
  'orientacoes_gerais': 'Orientações Gerais',
};

/**
 * Converte label do frontend para enum do Prisma.
 * Se já for um enum válido, retorna como está.
 */
export const motivoToEnum = (label) => {
  return MOTIVO_TO_ENUM[label] || label;
};

/**
 * Converte enum do Prisma para label do frontend.
 */
export const enumToMotivo = (enumVal) => {
  return ENUM_TO_MOTIVO[enumVal] || enumVal;
};

/**
 * Converte campos de motivo em um objeto de agendamento para o frontend.
 */
export const convertAppointmentMotivo = (appointment) => {
  if (!appointment) return appointment;
  return {
    ...appointment,
    motivo: enumToMotivo(appointment.motivo),
  };
};
