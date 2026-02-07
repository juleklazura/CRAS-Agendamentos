// =============================================================================
// 📅 CONSTANTES DE AGENDA - CONFIGURAÇÃO CENTRALIZADA
// =============================================================================
// Centraliza valores padrão de horários e dias de atendimento.
// Evita valores mágicos espalhados pelo código.

/**
 * Horários padrão disponíveis para agendamento (slots de 30 minutos)
 * CRAS funciona das 8h30 às 17h - sem horário de almoço (12:00-13:00)
 */
export const DEFAULT_HORARIOS = [
  '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
];

/**
 * Dias padrão de atendimento (1 = Segunda, 5 = Sexta)
 */
export const DEFAULT_DIAS_ATENDIMENTO = [1, 2, 3, 4, 5];

/**
 * Retorna o objeto de agenda padrão para novos entrevistadores
 */
export const getDefaultAgenda = () => ({
  horariosDisponiveis: [...DEFAULT_HORARIOS],
  diasAtendimento: [...DEFAULT_DIAS_ATENDIMENTO],
});
