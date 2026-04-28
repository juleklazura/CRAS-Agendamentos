// =============================================================================
// 📅 CONSTANTES DE AGENDA - CONFIGURAÇÃO CENTRALIZADA
// =============================================================================
// Centraliza valores padrão de horários e dias de atendimento.
// Evita valores mágicos espalhados pelo código.

/**
 * Horários padrão disponíveis para agendamento (slots de 30 minutos)
 * Carga 8hrs: CRAS funciona das 8h30 às 17h com pausa de almoço (12:00-13:00)
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
 * Limite máximo do expediente em minutos (17:00)
 */
const MAX_MINUTOS = 17 * 60;

/**
 * Limite mínimo do expediente em minutos (08:00)
 */
const MIN_MINUTOS = 8 * 60;

/**
 * Gera os slots de horário com base na carga horária e hora de entrada.
 *
 * Para carga de 8hrs, retorna os horários fixos padrão (com pausa de almoço).
 * Para 6hrs e 4hrs, gera slots contínuos de 30 em 30 minutos a partir de
 * horaEntrada + 30min até horaEntrada + cargaHoraria, nunca ultrapassando 17:00
 * nem antecipando 08:00.
 *
 * @param {number} cargaHoraria - 4, 6 ou 8
 * @param {string|null} horaEntrada - Horário de entrada no formato "HH:MM" (obrigatório para 4/6)
 * @returns {string[]} Array de strings no formato "HH:MM"
 */
export const generateHorarios = (cargaHoraria, horaEntrada) => {
  if (cargaHoraria === 8 || !horaEntrada) {
    return [...DEFAULT_HORARIOS];
  }

  const [startH, startM] = horaEntrada.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = Math.min(startMinutes + cargaHoraria * 60, MAX_MINUTOS);

  const slots = [];
  // Primeiro slot 30 min após a entrada
  let current = startMinutes + 30;

  while (current <= endMinutes - 30) {
    if (current >= MIN_MINUTOS) {
      const h = Math.floor(current / 60);
      const m = current % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
    current += 30;
  }

  // Inclui o último slot (que termina exatamente em endMinutes)
  if (current === endMinutes && current >= MIN_MINUTOS && current <= MAX_MINUTOS) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }

  return slots;
};

/**
 * Retorna o objeto de agenda padrão para novos entrevistadores
 */
export const getDefaultAgenda = () => ({
  horariosDisponiveis: [...DEFAULT_HORARIOS],
  diasAtendimento: [...DEFAULT_DIAS_ATENDIMENTO],
});
